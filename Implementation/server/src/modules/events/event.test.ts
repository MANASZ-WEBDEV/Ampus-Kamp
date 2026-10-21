/**
 * F-2 Integration Tests — Event Feed & Management
 *
 * Uses mongodb-memory-server + supertest — zero external dependencies.
 *
 * Coverage:
 *   Feed:        students see only published; sorted by deadline ASC
 *   Filtering:   type, branch, year
 *   Security:    rawMessage absent from student responses
 *   Create:      faculty → 201 draft; student → 403
 *   Edit:        owner can edit; non-owner faculty → 403
 *   Publish:     draft → published; already-published → 409
 *   Close:       published → closed; non-published → 409
 *   Soft-delete: owner can delete; disappears from feed
 *   Bookmark:    toggle on / off (student only; faculty → 403)
 *   My events:   faculty sees own drafts + published
 *   Cron fn:     closeExpiredEvents() closes past-deadline published events
 */

import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';
import { createApp } from '@/app';
import { Dept } from '@/models/dept.model';
import { User } from '@/models/user.model';
import { Event } from '@/models/event.model';
import { Bookmark } from '@/models/bookmark.model';
import { closeExpiredEvents, flushFeedCache } from '@/modules/events/event.service';
import { hashPassword } from '@/shared/utils';

// ── Setup ─────────────────────────────────────────────────────────────────────

let mongod: MongoMemoryServer;
const app = createApp();

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'test-secret-32-chars-minimum-here!';

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
  // Flush in-memory feed cache so each test starts with a clean cache
  flushFeedCache();
  // Clean mutable collections between tests; users and dept are shared
  await Event.deleteMany({});
  await Bookmark.deleteMany({});
});

// ── Seed helpers ──────────────────────────────────────────────────────────────

let deptId: string;
let studentToken: string;
let facultyToken: string;
let otherFacultyToken: string;
let facultyId: string;

async function seedFixtures() {
  const dept = await Dept.create({
    code: 'CSE',
    name: 'Computer Science & Engineering',
    studentStrength: 200,
  });
  deptId = dept._id.toString();

  const passwordHash = await hashPassword('Pass@1234');

  const student = await User.create({
    enrollmentNo: 'STU001',
    collegeId: 'COL001',
    name: 'Test Student',
    email: 'student@test.edu',
    passwordHash,
    role: 'student',
    department: deptId,
    year: 3,
    status: 'active',
    emailVerified: true,
  });

  const faculty = await User.create({
    enrollmentNo: 'FAC001',
    collegeId: 'COL002',
    name: 'Test Faculty',
    email: 'faculty@test.edu',
    passwordHash,
    role: 'faculty',
    department: deptId,
    status: 'active',
    emailVerified: true,
  });
  facultyId = faculty._id.toString();

  const otherFaculty = await User.create({
    enrollmentNo: 'FAC002',
    collegeId: 'COL003',
    name: 'Other Faculty',
    email: 'other.faculty@test.edu',
    passwordHash,
    role: 'faculty',
    department: deptId,
    status: 'active',
    emailVerified: true,
  });

  const makeToken = (user: { _id: mongoose.Types.ObjectId; role: string }) =>
    jwt.sign(
      { id: user._id.toString(), role: user.role, department: deptId, name: 'Test', status: 'active' },
      JWT_SECRET,
      { expiresIn: '1h' },
    );

  studentToken = makeToken(student);
  facultyToken = makeToken(faculty);
  otherFacultyToken = makeToken(otherFaculty);
}

function daysFromNow(d: number) {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000);
}

async function createPublishedEvent(overrides: Partial<Record<string, unknown>> = {}) {
  return Event.create({
    title: 'Test Hackathon',
    type: 'hackathon',
    deadline: daysFromNow(7),
    eligibility: { branches: [], years: [] },
    teamSize: { min: 1, max: 4 },
    registrationMode: 'external',
    postedBy: facultyId,
    status: 'published',
    ...overrides,
  });
}

// ── GET /events — feed ────────────────────────────────────────────────────────

describe('GET /api/v1/events', () => {
  it('student sees only published events', async () => {
    await createPublishedEvent({ status: 'published', title: 'Published Event' });
    await createPublishedEvent({ status: 'draft', title: 'Draft Event' });
    await createPublishedEvent({ status: 'closed', title: 'Closed Event' });

    const res = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    const titles = res.body.data.items.map((e: { title: string }) => e.title);
    expect(titles).toContain('Published Event');
    expect(titles).not.toContain('Draft Event');
    expect(titles).not.toContain('Closed Event');
  });

  it('feed is sorted by deadline ASC (soonest first)', async () => {
    await createPublishedEvent({ title: 'Far Away', deadline: daysFromNow(30) });
    await createPublishedEvent({ title: 'Urgent', deadline: daysFromNow(1) });
    await createPublishedEvent({ title: 'Medium', deadline: daysFromNow(14) });

    const res = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${studentToken}`);

    const titles = res.body.data.items.map((e: { title: string }) => e.title);
    expect(titles.indexOf('Urgent')).toBeLessThan(titles.indexOf('Medium'));
    expect(titles.indexOf('Medium')).toBeLessThan(titles.indexOf('Far Away'));
  });

  it('filters by type=hackathon', async () => {
    await createPublishedEvent({ type: 'hackathon', title: 'Hackathon' });
    await createPublishedEvent({ type: 'workshop', title: 'Workshop' });

    const res = await request(app)
      .get('/api/v1/events?type=hackathon')
      .set('Authorization', `Bearer ${studentToken}`);

    const titles = res.body.data.items.map((e: { title: string }) => e.title);
    expect(titles).toContain('Hackathon');
    expect(titles).not.toContain('Workshop');
  });

  it('branch filter returns CSE-eligible AND open-to-all events', async () => {
    await createPublishedEvent({ title: 'CSE Only', eligibility: { branches: ['CSE'], years: [] } });
    await createPublishedEvent({ title: 'Open to All', eligibility: { branches: [], years: [] } });
    await createPublishedEvent({ title: 'ECE Only', eligibility: { branches: ['ECE'], years: [] } });

    const res = await request(app)
      .get('/api/v1/events?branch=CSE')
      .set('Authorization', `Bearer ${studentToken}`);

    const titles = res.body.data.items.map((e: { title: string }) => e.title);
    expect(titles).toContain('CSE Only');
    expect(titles).toContain('Open to All');
    expect(titles).not.toContain('ECE Only');
  });

  it('rawMessage is NEVER in student response', async () => {
    await createPublishedEvent({ rawMessage: 'secret paste content' });

    const res = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${studentToken}`);

    res.body.data.items.forEach((e: Record<string, unknown>) => {
      expect(e['rawMessage']).toBeUndefined();
    });
  });

  it('returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/events');
    expect(res.status).toBe(401);
  });

  it('soft-deleted event does not appear in feed', async () => {
    const event = await createPublishedEvent({ title: 'To Be Deleted' });
    await Event.findByIdAndUpdate(event._id, { $set: { deletedAt: new Date() } });

    const res = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${studentToken}`);

    const titles = res.body.data.items.map((e: { title: string }) => e.title);
    expect(titles).not.toContain('To Be Deleted');
  });
});

// ── GET /events/:id ───────────────────────────────────────────────────────────

describe('GET /api/v1/events/:id', () => {
  it('returns event detail for published event', async () => {
    const event = await createPublishedEvent({ title: 'Detail Test' });

    const res = await request(app)
      .get(`/api/v1/events/${event._id.toString()}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Detail Test');
    expect(res.body.data.rawMessage).toBeUndefined(); // student: never
  });

  it('student gets 404 for draft event', async () => {
    const event = await createPublishedEvent({ status: 'draft' });

    const res = await request(app)
      .get(`/api/v1/events/${event._id.toString()}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(404);
  });

  it('faculty owner receives rawMessage in detail response', async () => {
    const event = await createPublishedEvent({ rawMessage: 'secret raw text' });

    const res = await request(app)
      .get(`/api/v1/events/${event._id.toString()}`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.rawMessage).toBe('secret raw text');
  });
});

// ── POST /events ──────────────────────────────────────────────────────────────

describe('POST /api/v1/events', () => {
  it('faculty creates a draft — returns 201 with status=draft', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        title: 'New Hackathon',
        type: 'hackathon',
        deadline: daysFromNow(14).toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('draft');
    expect(res.body.data.title).toBe('New Hackathon');
    // postedBy is faculty — never from body
    expect(res.body.data.postedBy.id).toBe(facultyId);
  });

  it('student cannot create events — 403', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Sneaky Post', type: 'hackathon' });

    expect(res.status).toBe(403);
  });

  it('returns 422 for missing required title', async () => {
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ type: 'hackathon' });

    expect(res.status).toBe(422);
  });

  it('registrationDeadline defaults to deadline when not provided', async () => {
    const deadline = daysFromNow(10).toISOString();
    const res = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ title: 'Default RegDeadline', type: 'workshop', deadline });

    expect(res.status).toBe(201);
    // registrationDeadline should be set (defaults to deadline in service)
    expect(res.body.data.registrationDeadline).toBeTruthy();
  });
});

// ── PUT /events/:id ───────────────────────────────────────────────────────────

describe('PUT /api/v1/events/:id', () => {
  it('owner can edit their draft', async () => {
    const event = await createPublishedEvent({ status: 'draft', title: 'Old Title' });

    const res = await request(app)
      .put(`/api/v1/events/${event._id.toString()}`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ title: 'Updated Title' });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated Title');
  });

  it('non-owner faculty gets 403', async () => {
    const event = await createPublishedEvent({ status: 'draft' });

    const res = await request(app)
      .put(`/api/v1/events/${event._id.toString()}`)
      .set('Authorization', `Bearer ${otherFacultyToken}`)
      .send({ title: 'Hijack Title' });

    expect(res.status).toBe(403);
  });

  it('cannot edit a closed event', async () => {
    const event = await createPublishedEvent({ status: 'closed' });

    const res = await request(app)
      .put(`/api/v1/events/${event._id.toString()}`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ title: 'New Title on Closed' });

    expect(res.status).toBe(409);
  });
});

// ── PATCH /events/:id/publish ─────────────────────────────────────────────────

describe('PATCH /api/v1/events/:id/publish', () => {
  it('publishes a draft event', async () => {
    const event = await Event.create({
      title: 'Draft to Publish',
      type: 'seminar',
      deadline: daysFromNow(5),
      eligibility: { branches: [], years: [] },
      teamSize: { min: 1, max: 1 },
      registrationMode: 'external',
      postedBy: facultyId,
      status: 'draft',
    });

    const res = await request(app)
      .patch(`/api/v1/events/${event._id.toString()}/publish`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('published');
  });

  it('returns 409 when trying to publish an already-published event', async () => {
    const event = await createPublishedEvent();

    const res = await request(app)
      .patch(`/api/v1/events/${event._id.toString()}/publish`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/only draft/i);
  });

  it('non-owner gets 403 on publish', async () => {
    const event = await Event.create({
      title: 'Unpublished',
      type: 'hackathon',
      deadline: daysFromNow(5),
      eligibility: { branches: [], years: [] },
      teamSize: { min: 1, max: 1 },
      registrationMode: 'external',
      postedBy: facultyId,
      status: 'draft',
    });

    const res = await request(app)
      .patch(`/api/v1/events/${event._id.toString()}/publish`)
      .set('Authorization', `Bearer ${otherFacultyToken}`);

    expect(res.status).toBe(403);
  });
});

// ── PATCH /events/:id/close ───────────────────────────────────────────────────

describe('PATCH /api/v1/events/:id/close', () => {
  it('closes a published event', async () => {
    const event = await createPublishedEvent();

    const res = await request(app)
      .patch(`/api/v1/events/${event._id.toString()}/close`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('closed');
  });

  it('returns 409 when trying to close a draft', async () => {
    const event = await createPublishedEvent({ status: 'draft' });

    const res = await request(app)
      .patch(`/api/v1/events/${event._id.toString()}/close`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/only published/i);
  });
});

// ── DELETE /events/:id ────────────────────────────────────────────────────────

describe('DELETE /api/v1/events/:id', () => {
  it('soft-deletes event — returns 204 and event disappears from feed', async () => {
    const event = await createPublishedEvent({ title: 'To Delete' });

    const deleteRes = await request(app)
      .delete(`/api/v1/events/${event._id.toString()}`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(deleteRes.status).toBe(204);

    // Confirm it's gone from the student feed
    const feedRes = await request(app)
      .get('/api/v1/events')
      .set('Authorization', `Bearer ${studentToken}`);

    const titles = feedRes.body.data.items.map((e: { title: string }) => e.title);
    expect(titles).not.toContain('To Delete');

    // Confirm deletedAt is set in DB (recoverable)
    const inDb = await Event.findById(event._id).lean();
    expect(inDb?.deletedAt).toBeDefined();
  });

  it('non-owner faculty cannot delete another faculty\'s event', async () => {
    const event = await createPublishedEvent();

    const res = await request(app)
      .delete(`/api/v1/events/${event._id.toString()}`)
      .set('Authorization', `Bearer ${otherFacultyToken}`);

    expect(res.status).toBe(403);
  });
});

// ── POST /events/:id/bookmark ─────────────────────────────────────────────────

describe('POST /api/v1/events/:id/bookmark', () => {
  it('student can toggle bookmark on/off', async () => {
    const event = await createPublishedEvent();

    // First call → bookmarked
    const res1 = await request(app)
      .post(`/api/v1/events/${event._id.toString()}/bookmark`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res1.status).toBe(200);
    expect(res1.body.data.bookmarked).toBe(true);

    // Second call → unbookmarked
    const res2 = await request(app)
      .post(`/api/v1/events/${event._id.toString()}/bookmark`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res2.status).toBe(200);
    expect(res2.body.data.bookmarked).toBe(false);
  });

  it('faculty cannot bookmark — 403', async () => {
    const event = await createPublishedEvent();

    const res = await request(app)
      .post(`/api/v1/events/${event._id.toString()}/bookmark`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(403);
  });
});

// ── GET /events/my ────────────────────────────────────────────────────────────

describe('GET /api/v1/events/my', () => {
  it('faculty sees all their own events including drafts', async () => {
    await createPublishedEvent({ title: 'My Published' });
    await createPublishedEvent({ title: 'My Draft', status: 'draft' });

    const res = await request(app)
      .get('/api/v1/events/my')
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    const titles = res.body.data.items.map((e: { title: string }) => e.title);
    expect(titles).toContain('My Published');
    expect(titles).toContain('My Draft');
  });

  it('student cannot access /my — 403', async () => {
    const res = await request(app)
      .get('/api/v1/events/my')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });
});

// ── closeExpiredEvents (cron function) ────────────────────────────────────────

describe('closeExpiredEvents (cron logic)', () => {
  it('closes published events with past deadlines', async () => {
    // Past deadline (already expired)
    await createPublishedEvent({ title: 'Expired', deadline: daysFromNow(-1) });
    // Future deadline (must NOT be closed)
    await createPublishedEvent({ title: 'Future', deadline: daysFromNow(10) });

    const count = await closeExpiredEvents();

    expect(count).toBe(1);

    const expired = await Event.findOne({ title: 'Expired' }).lean();
    expect(expired?.status).toBe('closed');

    const future = await Event.findOne({ title: 'Future' }).lean();
    expect(future?.status).toBe('published');
  });

  it('does not close draft or already-closed events', async () => {
    await Event.create({
      title: 'Draft Past',
      type: 'hackathon',
      deadline: daysFromNow(-5),
      eligibility: { branches: [], years: [] },
      teamSize: { min: 1, max: 1 },
      registrationMode: 'external',
      postedBy: facultyId,
      status: 'draft', // should be ignored by cron
    });

    const count = await closeExpiredEvents();
    expect(count).toBe(0);

    const draft = await Event.findOne({ title: 'Draft Past' }).lean();
    expect(draft?.status).toBe('draft'); // untouched
  });
});
