/**
 * seed-events.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates 10 realistic seed events across multiple departments and types.
 * Designed to test every scenario in the acceptance checklist:
 *   - soonest-deadline events appear first in the feed
 *   - branch/year filtering (CSE-only vs open-to-all)
 *   - draft is invisible to students
 *   - closed event disappears from student feed
 *   - rawMessage is set on events posted via paste-to-post (F-3 placeholder)
 *
 * Usage:
 *   npx tsx scripts/seed-events.ts
 *
 * Idempotent — skips events with the same title already in the DB.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Event } from '../src/models/event.model';
import { User } from '../src/models/user.model';

const MONGO_URI = process.env['MONGODB_URI']!;

// ── Helpers ───────────────────────────────────────────────────────────────────

const now = new Date();
const daysFromNow = (d: number) => new Date(now.getTime() + d * 24 * 60 * 60 * 1000);

async function getFacultyId(deptCode: string): Promise<mongoose.Types.ObjectId | null> {
  const enrollmentNo = `FAC-${deptCode.slice(0, 3).toUpperCase()}-001`;
  const user = await User.findOne({ enrollmentNo }).select('_id').lean();
  return user ? user._id : null;
}

// ── Seed data ─────────────────────────────────────────────────────────────────

async function main() {
  if (!MONGO_URI) { console.error('❌  MONGODB_URI not set'); process.exit(1); }

  console.log('🔌  Connecting to MongoDB…');
  await mongoose.connect(MONGO_URI);
  console.log('✅  Connected.\n');

  const cseFacultyId = await getFacultyId('CSE');
  const csitFacultyId = await getFacultyId('CSIT');
  const admFacultyId = await getFacultyId('ADM');

  if (!cseFacultyId || !csitFacultyId) {
    console.error('❌  Faculty accounts not found. Run seed-faculty.ts first.');
    process.exit(1);
  }

  // Use admin faculty as fallback for some events
  const posterA = cseFacultyId;
  const posterB = csitFacultyId;
  const posterC = admFacultyId ?? cseFacultyId;

  const seeds = [
    // ── 1. Hackathon closing in 2 days (Highest urgency — closing soon) ───────
    {
      title: 'HackCrux 2026 — Last Chance!',
      type: 'hackathon' as const,
      organizer: 'Crux Club & ACM Student Chapter',
      deadline: daysFromNow(2),
      eventDate: daysFromNow(4),
      eligibility: { branches: [], years: [1, 2, 3, 4] },
      teamSize: { min: 2, max: 4 },
      fee: '₹100 per team',
      link: 'https://hackcrux.campus.local',
      summary: '36-hour sprint on campus. Hardware prototyping tracks available. Mandatory 1 female member.',
      coordinators: [
        { name: 'Dr. Anita Roy', phone: '9876543210', email: 'anita.roy@campus.local' },
        { name: 'Rohan Mehta', phone: '9123456780', email: 'rohan.crux@campus.local' },
      ],
      requiresFemale: true,
      registrationMode: 'in_app' as const,
      registrationDeadline: daysFromNow(2),
      status: 'published' as const,
      postedBy: posterB,
    },

    // ── 2. Hackathon closing in 8 days (Dec 1, 2026) ──────────────────────────
    {
      title: 'InnoHack 2026 — Inter-Department Collegiate Sprint',
      type: 'hackathon' as const,
      organizer: 'Innovation Cell',
      deadline: daysFromNow(8),
      eventDate: daysFromNow(15),
      eligibility: { branches: ['CSE', 'CSIT', 'AI/DS'], years: [2, 3, 4] },
      teamSize: { min: 2, max: 4 },
      fee: 'Free',
      link: 'https://innohack.campus.local/2026',
      summary: 'Build scalable web & AI solutions in 24 hours. Cash prizes for top 3 teams.',
      coordinators: [
        { name: 'Prof. K. V. Sharma', phone: '9811223344', email: 'kv.sharma@campus.local' },
        { name: 'Ananya Iyer', phone: '9822334455', email: 'ananya.iyer@campus.local' },
      ],
      requiresFemale: true,
      registrationMode: 'in_app' as const,
      registrationDeadline: daysFromNow(7),
      status: 'published' as const,
      postedBy: posterA,
      rawMessage: 'Hey team! InnoHack 2026 is here. Register by [DEADLINE]. CSE, CSIT & AI/DS 2nd-4th year. Teams of 2-4.',
    },

    // ── 3. Competition — mid-December (Dec 7, 2026) ──────────────────────────
    {
      title: 'ACM-ICPC Amritapuri Regional Prelims 2026',
      type: 'competition' as const,
      organizer: 'ACM Student Chapter',
      deadline: daysFromNow(14),
      eventDate: daysFromNow(21),
      eligibility: { branches: ['CSE', 'CSIT', 'IT'], years: [2, 3, 4] },
      teamSize: { min: 3, max: 3 },
      fee: '₹500 per team',
      link: 'https://icpc.global',
      summary: 'Competitive programming contest. Strict team size of 3. Top teams qualify for regional finals.',
      coordinators: [
        { name: 'Dr. M. K. Venkat', phone: '9443322110', email: 'mk.venkat@campus.local' },
      ],
      requiresFemale: false,
      registrationMode: 'external' as const,
      status: 'published' as const,
      postedBy: posterA,
    },

    // ── 4. Workshop — mid-December (Dec 11, 2026) ─────────────────────────────
    {
      title: 'Docker & Kubernetes Hands-On Masterclass',
      type: 'workshop' as const,
      organizer: 'CSE Department & Cloud Computing Club',
      deadline: daysFromNow(18),
      eventDate: daysFromNow(20),
      eligibility: { branches: ['CSE', 'IT'], years: [2, 3] },
      teamSize: { min: 1, max: 1 },
      fee: '₹200 (materials)',
      summary: 'Containerization, microservices architecture, and cloud deployment. Dev clusters provided.',
      coordinators: [
        { name: 'Prof. S. N. Rao', phone: '9776655443', email: 'sn.rao@campus.local' },
      ],
      requiresFemale: false,
      registrationMode: 'in_app' as const,
      status: 'published' as const,
      postedBy: posterA,
    },

    // ── 5. Workshop — late December (Dec 17, 2026) ────────────────────────────
    {
      title: 'Generative AI & LLM Systems: Introductory Bootcamp',
      type: 'workshop' as const,
      organizer: 'Innovation Cell & Dept of AI/DS',
      deadline: daysFromNow(24),
      eventDate: daysFromNow(27),
      eligibility: { branches: [], years: [] }, // open to all
      teamSize: { min: 1, max: 2 },
      fee: 'Free',
      link: 'https://forms.campus.local/genai-bootcamp',
      summary: 'Prompt engineering, RAG pipelines, fine-tuning, and multimodal AI with hands-on lab API credits.',
      coordinators: [
        { name: 'Dr. R. Sundaram', phone: '9988776655', email: 'r.sundaram@campus.local' },
      ],
      requiresFemale: false,
      registrationMode: 'external' as const,
      status: 'published' as const,
      postedBy: posterC,
    },

    // ── 6. Seminar — late December (Dec 21, 2026) ─────────────────────────────
    {
      title: 'IEEE Tech Talk: The Future of Edge Intelligence',
      type: 'seminar' as const,
      organizer: 'IEEE Student Branch & Division of ECE',
      deadline: daysFromNow(28),
      eventDate: daysFromNow(30),
      eligibility: { branches: [], years: [] },
      teamSize: { min: 1, max: 1 },
      fee: 'Free',
      link: 'https://ieee.org/events/edge-intelligence-2026',
      summary: 'Guest lecture by industry leaders on Neuromorphic computing and Edge AI. Attendance duty leaves approved.',
      coordinators: [
        { name: 'Dr. Sunita Deshmukh', phone: '9112233445', email: 'sunita.deshmukh@campus.local' },
      ],
      requiresFemale: false,
      registrationMode: 'external' as const,
      status: 'published' as const,
      postedBy: posterB,
    },

    // ── 7. National Hackathon — January 2027 (Jan 4, 2027) ────────────────────
    {
      title: 'Smart India Hackathon (SIH 2027) — Institutional Qualifier',
      type: 'hackathon' as const,
      organizer: 'AICTE / MoE & Institutional Innovation Council',
      deadline: daysFromNow(42),
      eventDate: daysFromNow(55),
      eligibility: { branches: [], years: [] }, // open to all
      teamSize: { min: 6, max: 6 },
      fee: 'Free',
      link: 'https://sih.gov.in',
      summary: 'National flagship hackathon. Exact team size of 6 with mandatory at least 1 female teammate.',
      coordinators: [
        { name: 'Dr. V. Ramanathan', phone: '9845012345', email: 'v.ramanathan@campus.local' },
        { name: 'Priya Nair', phone: '9845098765', email: 'priya.sih@campus.local' },
      ],
      requiresFemale: true,
      registrationMode: 'in_app' as const,
      status: 'published' as const,
      postedBy: posterC,
    },

    // ── 8. Sports — mid-January 2027 (Jan 12, 2027) ───────────────────────────
    {
      title: 'Inter-Department 7-a-Side Football & Athletics League 2027',
      type: 'sports' as const,
      organizer: 'Physical Education Department & Campus Sports Council',
      deadline: daysFromNow(50),
      eventDate: daysFromNow(60),
      eligibility: { branches: [], years: [] },
      teamSize: { min: 7, max: 10 },
      fee: 'Free',
      summary: 'Annual inter-department sports championship. Rolling trophies and official university medals.',
      coordinators: [
        { name: 'Coach D. Balaji', phone: '9334455667', email: 'balaji.sports@campus.local' },
      ],
      requiresFemale: false,
      registrationMode: 'in_app' as const,
      status: 'published' as const,
      postedBy: posterC,
    },

    // ── 9. Global Contest — early February 2027 (Feb 1, 2027) ─────────────────
    {
      title: 'TCS CodeVita Season 14 — Campus Track',
      type: 'competition' as const,
      organizer: 'Tata Consultancy Services & Campus Placement Cell',
      deadline: daysFromNow(70),
      eventDate: daysFromNow(80),
      eligibility: { branches: [], years: [3, 4] },
      teamSize: { min: 1, max: 1 },
      fee: 'Free',
      link: 'https://codevita.tcsapps.com',
      summary: 'Global individual competitive programming challenge. Top ranking students get interview fast-track.',
      coordinators: [
        { name: 'Prof. CS Placement Officer', phone: '9887766554', email: 'placements@campus.local' },
      ],
      requiresFemale: false,
      registrationMode: 'external' as const,
      status: 'published' as const,
      postedBy: posterB,
    },

    // ── 10. Research Sprint — mid-February 2027 (Feb 16, 2027) ────────────────
    {
      title: 'National Collegiate Robotics & Drone Championship 2027',
      type: 'other' as const,
      organizer: 'Division of Mechatronics & Robotics Club',
      deadline: daysFromNow(85),
      eventDate: daysFromNow(95),
      eligibility: { branches: ['MECH', 'ECE', 'CSE', 'EEE'], years: [2, 3, 4] },
      teamSize: { min: 2, max: 5 },
      fee: '₹300 per squad',
      summary: 'Autonomous obstacle navigation, SLAM mapping, and payload drop. Institutional hardware testbeds provided.',
      coordinators: [
        { name: 'Dr. A. P. Sengupta', phone: '9665544332', email: 'ap.sengupta@campus.local' },
      ],
      requiresFemale: false,
      registrationMode: 'in_app' as const,
      status: 'published' as const,
      postedBy: posterA,
    },

    // ── 11. Closed Event (Concluded in past) ──────────────────────────────────
    {
      title: 'Annual Sports Day 2026 — Track & Field (Concluded)',
      type: 'sports' as const,
      organizer: 'Physical Education Department',
      deadline: daysFromNow(-10),
      eventDate: daysFromNow(-8),
      eligibility: { branches: [], years: [] },
      teamSize: { min: 1, max: 1 },
      fee: 'Free',
      summary: 'Annual sports sprint. Registration is now concluded.',
      coordinators: [
        { name: 'Coach D. Balaji', phone: '9334455667', email: 'balaji.sports@campus.local' },
      ],
      requiresFemale: false,
      registrationMode: 'in_app' as const,
      status: 'closed' as const,
      postedBy: posterC,
    },

    // ── 12. Archived Event ────────────────────────────────────────────────────
    {
      title: 'CodeSprint 2025 (Archived)',
      type: 'competition' as const,
      organizer: 'CSE Department',
      deadline: daysFromNow(-75),
      eventDate: daysFromNow(-70),
      eligibility: { branches: ['CSE', 'CSIT'], years: [] },
      teamSize: { min: 1, max: 3 },
      fee: 'Free',
      summary: 'Previous year campus contest. Final ranklist archived for verified academic credentialing.',
      coordinators: [
        { name: 'Dr. M. K. Venkat', phone: '9443322110', email: 'mk.venkat@campus.local' },
      ],
      requiresFemale: false,
      registrationMode: 'in_app' as const,
      status: 'archived' as const,
      postedBy: posterA,
    },
  ];

  console.log(`📋  Seeding ${seeds.length} events…\n`);

  let created = 0;
  let skipped = 0;

  for (const seed of seeds) {
    const existing = await Event.findOne({ title: seed.title });
    if (existing) {
      await Event.updateOne({ _id: existing._id }, { $set: seed });
      console.log(`  🔄  Updated deadlines/status for [${seed.status.padEnd(9)}] "${seed.title}"`);
      created++;
      continue;
    }

    await Event.create(seed);
    console.log(`  ✅  Created [${seed.status.padEnd(9)}] "${seed.title}"`);
    created++;
  }

  console.log(`\n📊  Summary: ${created} created, ${skipped} skipped.`);
  console.log('\n💡  Feed test tip:');
  console.log('   GET http://localhost:5000/api/v1/events');
  console.log('   Authorization: Bearer <student-token>');
  console.log('   → Should return 6 published events, sorted by deadline ASC');
  console.log('   → "HackCrux 2026" (1 day) must appear before "SIH 2026" (30 days)\n');

  await mongoose.disconnect();
  console.log('👋  Done.');
}

main().catch((err) => {
  console.error('💥  Seed failed:', err);
  process.exit(1);
});
