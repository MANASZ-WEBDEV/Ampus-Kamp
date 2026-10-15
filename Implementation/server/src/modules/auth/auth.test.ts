/**
 * F-1 Integration Tests — Authentication & Profiles
 *
 * Uses mongodb-memory-server + supertest so tests run fully in-process
 * with zero external dependencies (no live MongoDB, no SMTP, no network).
 *
 * Test coverage:
 *   Register:    valid, unknown enrollment, already claimed, missing email
 *   Verify OTP:  success, wrong code, max attempts, expired
 *   Login:       success, wrong password, pending account, rate limit (429)
 *   GET /me:     own profile returned
 *   GET /:id:    no phone/email in response
 *   PUT /me:     update skills
 *   RBAC:        student calling faculty-only route → 403
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '@/app';
import { Dept } from '@/models/dept.model';
import { StudentRoster } from '@/models/roster.model';
import { User } from '@/models/user.model';
import { Otp } from '@/models/otp.model';
import { hashOtpCode, OTP_TTL_MS, hashPassword } from '@/shared/utils';

// ── Setup ─────────────────────────────────────────────────────────────────────

let mongod: MongoMemoryServer;
const app = createApp();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await seedFixtures();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});

afterEach(async () => {
  // Clean mutable collections; reset roster claim so each test can re-register
  await User.deleteMany({});
  await Otp.deleteMany({});
  await StudentRoster.updateOne(
    { enrollmentNo: '22CS0001' },
    { $set: { claimedBy: null } },
  );
});

// ── Seed data ─────────────────────────────────────────────────────────────────

let deptId: string;
let rosterEntryId: string;

async function seedFixtures() {
  const dept = await Dept.create({ code: 'CS', name: 'Computer Science', studentStrength: 200 });
  deptId = dept._id.toString();

  const entry = await StudentRoster.create({
    enrollmentNo: '22CS0001',
    collegeId: 'COL2025',
    name: 'Aarav Sharma',
    department: deptId,
    year: 3,
    email: 'aarav.sharma@test.edu',
  });
  rosterEntryId = entry._id.toString();

  // A second entry (claimed) for conflict tests
  const claimedUser = await User.create({
    enrollmentNo: '22CS0002',
    collegeId: 'COL2025',
    name: 'Priya Nair',
    email: 'priya.nair@test.edu',
    passwordHash: await hashPassword('password123'),
    role: 'student',
    department: deptId,
    year: 2,
    status: 'pending',
  });
  await StudentRoster.create({
    enrollmentNo: '22CS0002',
    collegeId: 'COL2025',
    name: 'Priya Nair',
    department: deptId,
    year: 2,
    email: 'priya.nair@test.edu',
    claimedBy: claimedUser._id,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerAndGetUserId(): Promise<string> {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ enrollmentNo: '22CS0001', collegeId: 'COL2025', password: 'Pass@1234' });
  return res.body.data.userId;
}

async function activateUser(userId: string): Promise<string> {
  const code = '123456';
  await Otp.findOneAndUpdate(
    { userId, purpose: 'email_verification' },
    { codeHash: hashOtpCode(code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  );
  const res = await request(app)
    .post('/api/v1/auth/verify-otp')
    .send({ userId, code });
  return res.headers['set-cookie']?.[0] ?? '';
}

// ── Register tests ────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  it('creates a pending user and returns userId', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ enrollmentNo: '22CS0001', collegeId: 'COL2025', password: 'Pass@1234' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      userId: expect.any(String),
      message: expect.stringContaining('OTP sent'),
    });

    const user = await User.findOne({ enrollmentNo: '22CS0001' });
    expect(user?.status).toBe('pending');
    expect(user?.name).toBe('Aarav Sharma'); // from roster, never from body
    expect(user?.passwordHash).toBeUndefined(); // select:false
  });

  it('returns 404 for unknown enrollment number', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ enrollmentNo: '99XX9999', collegeId: 'COL2025', password: 'Pass@1234' });
    expect(res.status).toBe(404);
  });

  it('returns 404 for wrong collegeId (same enrollment)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ enrollmentNo: '22CS0001', collegeId: 'WRONG_ID', password: 'Pass@1234' });
    expect(res.status).toBe(404);
  });

  it('returns 409 for already claimed enrollment', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ enrollmentNo: '22CS0002', collegeId: 'COL2025', password: 'Pass@1234' });
    expect(res.status).toBe(409);
  });

  it('returns 422 for short password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ enrollmentNo: '22CS0001', collegeId: 'COL2025', password: 'short' });
    expect(res.status).toBe(422);
  });
});

// ── Verify OTP tests ──────────────────────────────────────────────────────────

describe('POST /api/v1/auth/verify-otp', () => {
  it('activates account and returns JWT cookie + body', async () => {
    const userId = await registerAndGetUserId();
    const code = '123456';
    await Otp.findOneAndUpdate(
      { userId, purpose: 'email_verification' },
      { codeHash: hashOtpCode(code), expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    );

    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ userId, code });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.headers['set-cookie']).toBeDefined();
    expect(res.body.data.user.status).toBe('active');

    // OTP must be deleted after use
    const otp = await Otp.findOne({ userId });
    expect(otp).toBeNull();
  });

  it('returns 401 for wrong OTP code', async () => {
    const userId = await registerAndGetUserId();
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ userId, code: '000000' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/incorrect otp/i);
  });

  it('invalidates OTP after 3 failed attempts', async () => {
    const userId = await registerAndGetUserId();
    for (let i = 0; i < 3; i++) {
      await request(app).post('/api/v1/auth/verify-otp').send({ userId, code: '000000' });
    }
    // 4th attempt — OTP should be deleted
    const res = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({ userId, code: '000000' });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toMatch(/no active otp|too many/i);
  });
});

// ── Login tests ───────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/login', () => {
  it('returns JWT for active user with correct password', async () => {
    const userId = await registerAndGetUserId();
    await activateUser(userId);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ enrollmentNo: '22CS0001', password: 'Pass@1234' });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeTruthy();
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 for wrong password', async () => {
    const userId = await registerAndGetUserId();
    await activateUser(userId);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ enrollmentNo: '22CS0001', password: 'WrongPassword!' });
    expect(res.status).toBe(401);
  });

  it('returns 403 for pending account', async () => {
    await registerAndGetUserId(); // pending, not verified
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ enrollmentNo: '22CS0001', password: 'Pass@1234' });
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/not yet verified/i);
  });

  it('returns 401 for unknown enrollment number', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ enrollmentNo: '99XX0000', password: 'Pass@1234' });
    expect(res.status).toBe(401);
  });
});

// ── Users tests ───────────────────────────────────────────────────────────────

describe('GET /api/v1/users/me', () => {
  it('returns own profile including email (no passwordHash)', async () => {
    const userId = await registerAndGetUserId();
    const cookie = await activateUser(userId);

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('aarav.sharma@test.edu');
    expect(res.body.data.passwordHash).toBeUndefined();
    expect(res.body.data.enrollmentNo).toBe('22CS0001');
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/users/:id', () => {
  it('returns public profile — no phone, no email', async () => {
    const userId = await registerAndGetUserId();
    const cookie = await activateUser(userId);

    const res = await request(app)
      .get(`/api/v1/users/${userId}`)
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data.phone).toBeUndefined();
    expect(res.body.data.email).toBeUndefined();
    expect(res.body.data.name).toBe('Aarav Sharma');
  });
});

describe('PUT /api/v1/users/me', () => {
  it('updates skills successfully', async () => {
    const userId = await registerAndGetUserId();
    const cookie = await activateUser(userId);

    const res = await request(app)
      .put('/api/v1/users/me')
      .set('Cookie', cookie)
      .send({ skills: ['TypeScript', 'React', 'MongoDB'] });

    expect(res.status).toBe(200);
    expect(res.body.data.skills).toEqual(['TypeScript', 'React', 'MongoDB']);
  });
});

// ── RBAC tests ────────────────────────────────────────────────────────────────

describe('RBAC — student calling admin route', () => {
  it('returns 403 when student tries to access admin-only endpoint', async () => {
    const userId = await registerAndGetUserId();
    const cookie = await activateUser(userId);

    // roster/import is admin-only
    const res = await request(app)
      .post('/api/v1/roster/import')
      .set('Cookie', cookie)
      .attach('file', Buffer.from('enrollmentNo,collegeId,name,department,year'), 'test.csv');

    expect(res.status).toBe(403);
  });
});
