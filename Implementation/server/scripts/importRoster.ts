/**
 * scripts/importRoster.ts
 * ─────────────────────────────────────────────────────
 * Standalone CLI script — import a CSV roster file into MongoDB.
 * Run: npx tsx scripts/importRoster.ts ./path/to/roster.csv
 *
 * CSV format (header row required):
 *   enrollmentNo,collegeId,name,department,year,email
 *   22CS0001,COL2025,Aarav Sharma,CS,3,aarav@college.edu
 *
 * Departments are auto-created by code if they don't exist.
 */

import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { importRoster } from '../src/modules/roster/roster.service';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI is not set in .env');
  process.exit(1);
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: npx tsx scripts/importRoster.ts <path-to-csv>');
  process.exit(1);
}

const absPath = path.resolve(process.cwd(), csvPath);
if (!fs.existsSync(absPath)) {
  console.error(`❌  File not found: ${absPath}`);
  process.exit(1);
}

async function main() {
  console.log(`\n📋  Connecting to MongoDB…`);
  await mongoose.connect(MONGODB_URI!);

  console.log(`📂  Reading: ${absPath}`);
  const buffer = fs.readFileSync(absPath);

  console.log(`⚙️   Importing…`);
  const result = await importRoster(buffer);

  console.log(`\n✅  Import complete:`);
  console.log(`    Inserted/updated : ${result.inserted}`);
  console.log(`    Skipped (claimed): ${result.skipped}`);

  if (result.errors.length > 0) {
    console.warn(`\n⚠️   ${result.errors.length} row(s) had errors:`);
    result.errors.forEach(({ row, reason }) => {
      console.warn(`    Row ${row}: ${reason}`);
    });
  }

  await mongoose.disconnect();
  console.log(`\n👋  Done.\n`);
}

main().catch((err) => {
  console.error('❌  Import failed:', err);
  mongoose.disconnect();
  process.exit(1);
});
