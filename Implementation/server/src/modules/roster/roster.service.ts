import { parse } from 'csv-parse/sync';
import { Dept } from '@/models/dept.model';
import { StudentRoster } from '@/models/roster.model';
import { rosterRowSchema, type RosterRow } from './roster.schema';

export interface ImportRosterResult {
  inserted: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

/**
 * Import a CSV roster buffer into the database.
 * - Upserts Departments by code (creates if missing).
 * - Upserts StudentRoster rows by enrollmentNo (skip if claimedBy is already set).
 * - Returns a detailed report: inserted, skipped, per-row errors.
 */
export async function importRoster(
  csvBuffer: Buffer,
): Promise<ImportRosterResult> {
  // ── Parse CSV ──────────────────────────────────────────────────────────────
  const rawRows = parse(csvBuffer, {
    columns: true,       // use first row as header
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  const result: ImportRosterResult = { inserted: 0, skipped: 0, errors: [] };

  // ── Dept cache (avoid N DB lookups) ───────────────────────────────────────
  const deptCache = new Map<string, string>(); // code → _id string

  async function getDeptId(code: string): Promise<string> {
    const key = code.toUpperCase();
    if (deptCache.has(key)) return deptCache.get(key)!;

    const dept = await Dept.findOneAndUpdate(
      { code: key },
      { $setOnInsert: { code: key, name: key, studentStrength: 0 } },
      { upsert: true, new: true },
    ).lean();

    const id = dept._id.toString();
    deptCache.set(key, id);
    return id;
  }

  // ── Process rows ───────────────────────────────────────────────────────────
  for (let i = 0; i < rawRows.length; i++) {
    const rowNum = i + 2; // +2 because row 1 is headers

    // Validate row shape
    const parsed = rosterRowSchema.safeParse(rawRows[i]);
    if (!parsed.success) {
      result.errors.push({
        row: rowNum,
        reason: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      });
      continue;
    }

    const row: RosterRow = parsed.data;

    try {
      const deptId = await getDeptId(row.department);

      // Skip rows where the slot is already claimed (student already registered)
      const existing = await StudentRoster.findOne({ enrollmentNo: row.enrollmentNo }).lean();
      if (existing?.claimedBy) {
        result.skipped++;
        continue;
      }

      // Upsert roster entry
      await StudentRoster.findOneAndUpdate(
        { enrollmentNo: row.enrollmentNo },
        {
          $set: {
            collegeId: row.collegeId,
            name: row.name,
            department: deptId,
            year: row.year,
            ...(row.email ? { email: row.email } : {}),
          },
          $setOnInsert: { claimedBy: null },
        },
        { upsert: true, new: true },
      );

      result.inserted++;
    } catch (err) {
      result.errors.push({
        row: rowNum,
        reason: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return result;
}
