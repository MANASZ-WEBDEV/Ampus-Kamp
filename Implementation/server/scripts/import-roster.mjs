/**
 * scripts/import-roster.mjs
 *
 * Direct DB import script — bypasses HTTP, connects to MongoDB via the same
 * MONGODB_URI used by the server. Run from the server directory:
 *
 *   node scripts/import-roster.mjs <path-to-csv>
 *
 * After import, checks for a specific email and prints the roster entry.
 */

import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

// ── Load env ──────────────────────────────────────────────────────────────────
dotenv.config({ path: path.resolve('..', '..', 'server', '.env') });
dotenv.config({ path: path.resolve('.env') }); // fallback

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI not set. Check your .env file.');
  process.exit(1);
}

const CSV_PATH = process.argv[2];
if (!CSV_PATH) {
  console.error('Usage: node scripts/import-roster.mjs <path-to-csv>');
  process.exit(1);
}

const CHECK_EMAIL = process.argv[3] ?? 'lovechouhan235377@acropolis.in';

// ── Schemas (inline — no TypeScript needed) ──────────────────────────────────
const deptSchema = new mongoose.Schema({
  code:            { type: String, required: true, unique: true, uppercase: true, trim: true },
  name:            { type: String, required: true, trim: true },
  studentStrength: { type: Number, default: 0 },
}, { timestamps: true });

const rosterSchema = new mongoose.Schema({
  enrollmentNo: { type: String, required: true, unique: true, uppercase: true, trim: true },
  collegeId:    { type: String, required: true, trim: true },
  name:         { type: String, required: true, trim: true },
  department:   { type: mongoose.Schema.Types.ObjectId, ref: 'Dept', required: true },
  year:         { type: Number, required: true, min: 1, max: 5 },
  email:        { type: String, trim: true, lowercase: true, default: null },
  claimedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

rosterSchema.index({ enrollmentNo: 1, collegeId: 1 });

const Dept         = mongoose.models.Dept         ?? mongoose.model('Dept',          deptSchema);
const StudentRoster = mongoose.models.StudentRoster ?? mongoose.model('StudentRoster', rosterSchema);

// ── Connect ───────────────────────────────────────────────────────────────────
console.log('🔌  Connecting to MongoDB…');
await mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 15_000,
  heartbeatFrequencyMS:     3_000,
  retryWrites: true,
  retryReads:  true,
});
console.log(`✅  Connected to: ${mongoose.connection.host}/${mongoose.connection.name}\n`);

// ── Parse CSV ─────────────────────────────────────────────────────────────────
const csvBuffer = fs.readFileSync(path.resolve(CSV_PATH));
const rows = parse(csvBuffer, { columns: true, skip_empty_lines: true, trim: true });
console.log(`📄  CSV parsed: ${rows.length} student rows found.\n`);

// ── Import ────────────────────────────────────────────────────────────────────
const deptCache = new Map(); // code → ObjectId string

async function getDeptId(code) {
  const key = code.toUpperCase();
  if (deptCache.has(key)) return deptCache.get(key);
  const dept = await Dept.findOneAndUpdate(
    { code: key },
    { $setOnInsert: { code: key, name: key, studentStrength: 0 } },
    { upsert: true, new: true },
  ).lean();
  deptCache.set(key, dept._id.toString());
  return dept._id.toString();
}

let inserted = 0, skipped = 0, errors = [];

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  const rowNum = i + 2;

  if (!row.enrollmentNo || !row.collegeId || !row.name || !row.department || !row.year) {
    errors.push({ row: rowNum, reason: 'Missing required field(s)' });
    continue;
  }

  try {
    const deptId = await getDeptId(row.department);
    const existing = await StudentRoster.findOne({ enrollmentNo: row.enrollmentNo.toUpperCase() }).lean();

    if (existing?.claimedBy) {
      skipped++;
      continue;
    }

    await StudentRoster.findOneAndUpdate(
      { enrollmentNo: row.enrollmentNo.toUpperCase() },
      {
        $set: {
          collegeId:  row.collegeId,
          name:       row.name,
          department: deptId,
          year:       Number(row.year),
          ...(row.email ? { email: row.email.toLowerCase() } : {}),
        },
        $setOnInsert: { claimedBy: null },
      },
      { upsert: true, new: true },
    );

    inserted++;
  } catch (err) {
    errors.push({ row: rowNum, reason: err.message ?? 'Unknown error' });
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════');
console.log(`✅  Import complete`);
console.log(`   Inserted/updated : ${inserted}`);
console.log(`   Skipped (claimed): ${skipped}`);
console.log(`   Errors           : ${errors.length}`);
if (errors.length) {
  console.log('\n   Error details:');
  errors.forEach(e => console.log(`   Row ${e.row}: ${e.reason}`));
}
console.log('═══════════════════════════════════════════════\n');

// ── Lookup: check the specific email ─────────────────────────────────────────
console.log(`🔍  Checking roster for: ${CHECK_EMAIL}`);
const entry = await StudentRoster
  .findOne({ email: CHECK_EMAIL.toLowerCase() })
  .populate('department', 'code name')
  .lean();

if (!entry) {
  console.log(`\n❌  NOT FOUND: ${CHECK_EMAIL} is not in the roster.`);
  console.log('   Make sure the CSV contains this email and the import succeeded.\n');
} else {
  console.log(`\n✅  FOUND in roster:`);
  console.log(`   Name         : ${entry.name}`);
  console.log(`   Enrollment   : ${entry.enrollmentNo}`);
  console.log(`   College ID   : ${entry.collegeId}`);
  console.log(`   Department   : ${entry.department?.code ?? 'unknown'}`);
  console.log(`   Year         : ${entry.year}`);
  console.log(`   Email        : ${entry.email}`);
  console.log(`   Claimed By   : ${entry.claimedBy ?? '(unclaimed — can register)'}`);
  console.log(`\n   To sign up, use:`);
  console.log(`     Enrollment No : ${entry.enrollmentNo}`);
  console.log(`     College ID    : ${entry.collegeId}`);
}

await mongoose.disconnect();
console.log('\n🔌  Disconnected. Done.');
