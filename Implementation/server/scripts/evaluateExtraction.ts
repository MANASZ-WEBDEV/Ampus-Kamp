/**
 * evaluateExtraction.ts — F-3 Research Evaluation Script
 *
 * Computes precision, recall, and F1 for each extracted field,
 * comparing LLM vs. Regex baseline against a labeled CSV dataset.
 *
 * Usage:
 *   npx tsx scripts/evaluateExtraction.ts --csv ./data/labeled_announcements.csv
 *   npx tsx scripts/evaluateExtraction.ts --csv ./data/labeled_announcements.csv --verbose
 *
 * CSV Format (required columns):
 *   rawMessage, title, type, deadline, eventDate, fee, link,
 *   teamSize_min, teamSize_max, eligibility_branches, eligibility_years, summary
 *
 *   - Empty string = field not present in announcement
 *   - eligibility_branches: semicolon-separated, e.g. "CSE;IT"
 *   - eligibility_years:    semicolon-separated, e.g. "2;3"
 *
 * Output: table of precision/recall/F1 per field + overall macro-average
 */

import { parse as parseCsv } from 'csv-parse/sync';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load env before importing services (for LLM_API_KEY)
dotenv.config({ path: path.join(__dirname, '../.env') });

// We import via direct paths to avoid issues with tsconfig path aliases
// when running with npx tsx outside the main build
const { llmExtract } = await import('../src/modules/events/extraction/llm.service.js') as typeof import('../src/modules/events/extraction/llm.service');
const { regexExtract } = await import('../src/modules/events/extraction/regex.service.js') as typeof import('../src/modules/events/extraction/regex.service');

// ── CLI args ──────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const csvFlag = args.indexOf('--csv');
const verbose = args.includes('--verbose');

if (csvFlag === -1 || !args[csvFlag + 1]) {
  console.error('Usage: npx tsx scripts/evaluateExtraction.ts --csv <path-to-csv>');
  process.exit(1);
}

const csvPath = path.resolve(args[csvFlag + 1]);
if (!fs.existsSync(csvPath)) {
  console.error(`CSV file not found: ${csvPath}`);
  process.exit(1);
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LabeledRow {
  rawMessage: string;
  title: string;
  type: string;
  deadline: string;
  eventDate: string;
  fee: string;
  link: string;
  teamSize_min: string;
  teamSize_max: string;
  eligibility_branches: string;  // semicolon-separated
  eligibility_years: string;     // semicolon-separated
  summary: string;
}

interface FieldScore {
  tp: number;  // true positives
  fp: number;  // false positives
  fn: number;  // false negatives
}

type ScoreMap = Record<string, FieldScore>;

// ── Field comparison helpers ──────────────────────────────────────────────────

function normaliseString(s: string | undefined | null): string {
  return (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function matchString(predicted: string | undefined, expected: string): boolean {
  if (!expected) return predicted === undefined || predicted === '';
  if (!predicted) return false;
  // Accept partial matches for title/organizer/summary (≥60% word overlap)
  const pWords = new Set(normaliseString(predicted).split(' '));
  const eWords = normaliseString(expected).split(' ');
  if (eWords.length === 0) return true;
  const overlap = eWords.filter(w => pWords.has(w)).length;
  return overlap / eWords.length >= 0.6;
}

function matchDate(predicted: string | undefined, expected: string): boolean {
  if (!expected) return predicted === undefined || predicted === '';
  if (!predicted) return false;
  // Compare just the YYYY-MM-DD part
  const pDate = predicted.slice(0, 10);
  const eDate = new Date(expected).toISOString().slice(0, 10);
  return pDate === eDate;
}

function matchList(predicted: string[] | undefined, expectedRaw: string): boolean {
  if (!expectedRaw) return !predicted || predicted.length === 0;
  const expected = expectedRaw.split(';').map(s => s.trim().toUpperCase()).filter(Boolean);
  if (!predicted || predicted.length === 0) return false;
  const norm = predicted.map(s => s.toUpperCase());
  return expected.every(e => norm.includes(e));
}

// ── Score accumulation ────────────────────────────────────────────────────────

function scoreField(
  map: ScoreMap,
  field: string,
  predicted: string | string[] | undefined,
  expected: string,
  matchFn: (p: string | undefined, e: string) => boolean,
): void {
  if (!map[field]) map[field] = { tp: 0, fp: 0, fn: 0 };

  const hasExpected = expected.trim() !== '';
  const hasPredicted = predicted !== undefined && predicted !== '' && (!Array.isArray(predicted) || predicted.length > 0);

  const predStr = Array.isArray(predicted) ? predicted.join(';') : predicted;
  const matched = matchFn(predStr, expected);

  if (hasExpected && hasPredicted && matched) map[field].tp++;
  else if (hasPredicted && !matched)          map[field].fp++;
  else if (hasExpected && !hasPredicted)      map[field].fn++;
}

// ── Metrics computation ───────────────────────────────────────────────────────

function computeMetrics(score: FieldScore): { precision: number; recall: number; f1: number } {
  const precision = score.tp + score.fp > 0 ? score.tp / (score.tp + score.fp) : 0;
  const recall    = score.tp + score.fn > 0 ? score.tp / (score.tp + score.fn) : 0;
  const f1        = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  return { precision, recall, f1 };
}

function pct(n: number): string { return `${(n * 100).toFixed(1)}%`; }

// ── Table renderer ────────────────────────────────────────────────────────────

function renderTable(title: string, scoreMap: ScoreMap): void {
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(62));
  console.log('  Field               Precision   Recall      F1');
  console.log('  ' + '─'.repeat(58));

  let totalF1 = 0;
  let fieldCount = 0;

  for (const [field, score] of Object.entries(scoreMap)) {
    const { precision, recall, f1 } = computeMetrics(score);
    totalF1 += f1;
    fieldCount++;
    console.log(
      `  ${field.padEnd(20)}${pct(precision).padEnd(12)}${pct(recall).padEnd(12)}${pct(f1)}`,
    );
  }

  const macroF1 = fieldCount > 0 ? totalF1 / fieldCount : 0;
  console.log('  ' + '─'.repeat(58));
  console.log(`  ${'Macro Average'.padEnd(20)}${''.padEnd(24)}${pct(macroF1)}`);
  console.log('═'.repeat(62));
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(raw, { columns: true, skip_empty_lines: true }) as LabeledRow[];

  console.log(`\n📊  Evaluating extraction on ${rows.length} labeled samples…\n`);

  const llmScores: ScoreMap = {};
  const regexScores: ScoreMap = {};

  let processed = 0;

  for (const row of rows) {
    if (!row.rawMessage?.trim()) continue;

    // Run both extractors
    const [llmResult, regexResult] = await Promise.all([
      llmExtract(row.rawMessage),
      Promise.resolve(regexExtract(row.rawMessage)),
    ]);

    const llmE  = llmResult.extracted;
    const regE  = regexResult;

    // Score each field for both extractors
    scoreField(llmScores,   'title',    llmE.title,    row.title,    matchString);
    scoreField(regexScores, 'title',    regE.title,    row.title,    matchString);

    scoreField(llmScores,   'type',     llmE.type,     row.type,     (p, e) => normaliseString(p) === normaliseString(e));
    scoreField(regexScores, 'type',     regE.type,     row.type,     (p, e) => normaliseString(p) === normaliseString(e));

    scoreField(llmScores,   'deadline',  llmE.deadline,  row.deadline,  matchDate);
    scoreField(regexScores, 'deadline',  regE.deadline,  row.deadline,  matchDate);

    scoreField(llmScores,   'eventDate', llmE.eventDate, row.eventDate, matchDate);
    scoreField(regexScores, 'eventDate', regE.eventDate, row.eventDate, matchDate);

    scoreField(llmScores,   'fee',  llmE.fee,  row.fee,  matchString);
    scoreField(regexScores, 'fee',  regE.fee,  row.fee,  matchString);

    scoreField(llmScores,   'link', llmE.link, row.link, (p, e) => normaliseString(p) === normaliseString(e));
    scoreField(regexScores, 'link', regE.link, row.link, (p, e) => normaliseString(p) === normaliseString(e));

    // teamSize — compare min and max together
    const llmTsStr  = llmE.teamSize  ? `${llmE.teamSize.min}-${llmE.teamSize.max}` : undefined;
    const regTsStr  = regE.teamSize  ? `${regE.teamSize.min}-${regE.teamSize.max}` : undefined;
    const expTsStr  = row.teamSize_min && row.teamSize_max ? `${row.teamSize_min}-${row.teamSize_max}` : '';
    scoreField(llmScores,   'teamSize', llmTsStr, expTsStr, (p, e) => normaliseString(p) === normaliseString(e));
    scoreField(regexScores, 'teamSize', regTsStr, expTsStr, (p, e) => normaliseString(p) === normaliseString(e));

    scoreField(llmScores,   'branches', llmE.eligibility?.branches, row.eligibility_branches, (p, e) => matchList(p?.split(';'), e));
    scoreField(regexScores, 'branches', regE.eligibility?.branches, row.eligibility_branches, (p, e) => matchList(p?.split(';'), e));

    scoreField(llmScores,   'years', llmE.eligibility?.years?.join(';'), row.eligibility_years, (p, e) => matchList(p?.split(';'), e));
    scoreField(regexScores, 'years', regE.eligibility?.years?.join(';'), row.eligibility_years, (p, e) => matchList(p?.split(';'), e));

    scoreField(llmScores,   'summary', llmE.summary, row.summary, matchString);
    scoreField(regexScores, 'summary', regE.summary, row.summary, matchString);

    processed++;

    if (verbose) {
      console.log(`\n[${processed}/${rows.length}] ${row.rawMessage.slice(0, 60)}…`);
      console.log('  LLM usedFallback:', llmResult.usedFallback);
    }
  }

  console.log(`\nProcessed ${processed} samples.`);

  renderTable('LLM (Gemini) Results', llmScores);
  renderTable('Regex Baseline Results', regexScores);
}

main().catch((err) => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
