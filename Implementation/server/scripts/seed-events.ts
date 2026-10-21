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
    // ── 1. Hackathon closing in 3 days (CSE + CSIT eligible) ────────────────
    {
      title: 'InnoHack 2026 — Internal College Hackathon',
      type: 'hackathon' as const,
      organizer: 'Innovation Cell',
      deadline: daysFromNow(3),
      eventDate: daysFromNow(10),
      eligibility: { branches: ['CSE', 'CSIT'], years: [2, 3, 4] },
      teamSize: { min: 2, max: 4 },
      fee: 'Free',
      link: 'https://innohack.campus.local/2026',
      summary: 'Build something in 24 hours. Cash prizes for top 3 teams.',
      registrationMode: 'in_app' as const,
      registrationDeadline: daysFromNow(2),
      status: 'published' as const,
      postedBy: posterA,
      rawMessage: 'Hey team! InnoHack 2026 is here. Register by [DEADLINE]. CSE & CSIT 2nd-4th year. Teams of 2-4.',
    },

    // ── 2. Hackathon closing in 30 days (open to all) ────────────────────────
    {
      title: 'Smart India Hackathon 2026 — College Selection Round',
      type: 'hackathon' as const,
      organizer: 'AICTE / MoE',
      deadline: daysFromNow(30),
      eventDate: daysFromNow(45),
      eligibility: { branches: [], years: [] }, // open to all
      teamSize: { min: 4, max: 6 },
      fee: 'Free',
      link: 'https://sih.gov.in',
      summary: 'National hackathon. Teams must pass the internal selection round first.',
      registrationMode: 'in_app' as const,
      status: 'published' as const,
      postedBy: posterC,
    },

    // ── 3. Competition — published ────────────────────────────────────────────
    {
      title: 'ACM-ICPC Amritapuri Regional 2026',
      type: 'competition' as const,
      organizer: 'ACM',
      deadline: daysFromNow(14),
      eventDate: daysFromNow(21),
      eligibility: { branches: ['CSE', 'CSIT', 'IT'], years: [2, 3] },
      teamSize: { min: 3, max: 3 },
      fee: '₹500 per team',
      link: 'https://icpc.global',
      summary: 'Competitive programming. Strict team size of 3. Max 2 teams per college.',
      registrationMode: 'external' as const,
      status: 'published' as const,
      postedBy: posterA,
    },

    // ── 4. Competition — draft (invisible to students) ────────────────────────
    {
      title: 'TCS CodeVita Season 13',
      type: 'competition' as const,
      organizer: 'Tata Consultancy Services',
      deadline: daysFromNow(60),
      eligibility: { branches: [], years: [3, 4] },
      teamSize: { min: 1, max: 1 },
      fee: 'Free',
      link: 'https://codevita.tcsapps.com',
      summary: 'Individual global coding contest. Top performers get TCS interview priority.',
      registrationMode: 'external' as const,
      status: 'draft' as const, // students CANNOT see this
      postedBy: posterB,
    },

    // ── 5. Sports event — closed (deadline in the past) ──────────────────────
    {
      title: 'Annual Sports Day 2026 — Track & Field Events',
      type: 'sports' as const,
      organizer: 'Physical Education Department',
      deadline: daysFromNow(-5), // already past
      eventDate: daysFromNow(-3),
      eligibility: { branches: [], years: [] },
      teamSize: { min: 1, max: 1 },
      fee: 'Free',
      summary: 'Annual intra-college sports. Registration is now closed.',
      registrationMode: 'in_app' as const,
      status: 'closed' as const, // disappeared from student feed
      postedBy: posterC,
    },

    // ── 6. Workshop — CSE-only, year 2 ───────────────────────────────────────
    {
      title: 'Docker & Kubernetes Hands-On Workshop',
      type: 'workshop' as const,
      organizer: 'CSE Department',
      deadline: daysFromNow(7),
      eventDate: daysFromNow(9),
      eligibility: { branches: ['CSE'], years: [2] },
      teamSize: { min: 1, max: 1 },
      fee: '₹200 (materials)',
      summary: '2-day hands-on workshop. Bring your own laptop. Limited seats.',
      registrationMode: 'in_app' as const,
      status: 'published' as const,
      postedBy: posterA,
    },

    // ── 7. Workshop — open to all years ──────────────────────────────────────
    {
      title: 'Generative AI for Students — Introductory Workshop',
      type: 'workshop' as const,
      organizer: 'Innovation Cell',
      deadline: daysFromNow(20),
      eventDate: daysFromNow(22),
      eligibility: { branches: [], years: [] }, // open to all
      teamSize: { min: 1, max: 1 },
      fee: 'Free',
      link: 'https://forms.example.com/genai-workshop',
      summary: 'ChatGPT, Gemini, image models — practical demos + use cases.',
      registrationMode: 'external' as const,
      status: 'published' as const,
      postedBy: posterC,
    },

    // ── 8. Seminar — external registration ────────────────────────────────────
    {
      title: 'IEEE Tech Talk: The Future of Edge Computing',
      type: 'seminar' as const,
      organizer: 'IEEE Student Branch',
      deadline: daysFromNow(5),
      eventDate: daysFromNow(6),
      eligibility: { branches: [], years: [] },
      teamSize: { min: 1, max: 1 },
      fee: 'Free',
      link: 'https://ieee.org/events/edge-computing-2026',
      summary: 'Guest lecture by industry expert. Certificate of participation provided.',
      registrationMode: 'external' as const,
      status: 'published' as const,
      postedBy: posterB,
    },

    // ── 9. Archived event ─────────────────────────────────────────────────────
    {
      title: 'CodeSprint 2025 (Archived)',
      type: 'competition' as const,
      organizer: 'CSE Department',
      deadline: daysFromNow(-90),
      eventDate: daysFromNow(-85),
      eligibility: { branches: ['CSE', 'CSIT'], years: [] },
      teamSize: { min: 1, max: 3 },
      fee: 'Free',
      summary: 'Previous year competition. Archived for reference.',
      registrationMode: 'in_app' as const,
      status: 'archived' as const,
      postedBy: posterA,
    },

    // ── 10. Hackathon — closing in 1 day (highest urgency, should appear first)
    {
      title: 'HackCrux 2026 — Last Chance!',
      type: 'hackathon' as const,
      organizer: 'Crux Club',
      deadline: daysFromNow(1),
      eventDate: daysFromNow(3),
      eligibility: { branches: [], years: [1, 2, 3, 4] },
      teamSize: { min: 2, max: 5 },
      fee: '₹100 per team',
      link: 'https://hackcrux.campus.local',
      summary: '36-hour hackathon. Theme revealed at start. Prizes worth ₹50,000.',
      registrationMode: 'in_app' as const,
      status: 'published' as const,
      postedBy: posterB,
    },
  ];

  console.log(`📋  Seeding ${seeds.length} events…\n`);

  let created = 0;
  let skipped = 0;

  for (const seed of seeds) {
    const existing = await Event.findOne({ title: seed.title }).lean();
    if (existing) {
      console.log(`  ℹ️   Skipping (already exists): "${seed.title}"`);
      skipped++;
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
