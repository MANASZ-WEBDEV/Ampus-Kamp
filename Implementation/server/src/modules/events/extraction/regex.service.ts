/**
 * regex.service.ts — F-3 Regex Baseline Extractor
 *
 * A deterministic, zero-dependency alternative to the LLM extractor.
 * Runs in parallel with the LLM call for research comparison.
 * Never throws — always returns a (possibly empty) partial result.
 *
 * Field coverage:
 *   title, type, deadline, eventDate, fee, link, teamSize, branches, years, summary
 */

import type { ExtractedEventFields } from './extraction.schema';

// ── Type helpers ──────────────────────────────────────────────────────────────

type EventType = 'hackathon' | 'competition' | 'sports' | 'workshop' | 'seminar' | 'other';

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTH_MAP: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04',
  jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

const BRANCH_KEYWORDS: Record<string, string> = {
  'computer science': 'CSE',
  cse: 'CSE',
  'cs&it': 'CSIT',
  csit: 'CSIT',
  it: 'IT',
  'information technology': 'IT',
  ece: 'ECE',
  electronics: 'ECE',
  electrical: 'EE',
  ee: 'EE',
  mechanical: 'ME',
  me: 'ME',
  civil: 'CE',
  ce: 'CE',
};

const TYPE_KEYWORDS: Array<{ pattern: RegExp; value: EventType }> = [
  { pattern: /\bhackathon\b/i, value: 'hackathon' },
  { pattern: /\bcompetition\b|\bcontest\b|\bolympiad\b/i, value: 'competition' },
  { pattern: /\bsports?\b|\bgames?\b|\bathletics?\b|\btournament\b/i, value: 'sports' },
  { pattern: /\bworkshop\b|\bhands[- ]?on\b|\bbootcamp\b/i, value: 'workshop' },
  { pattern: /\bseminar\b|\btalk\b|\bwebinar\b|\blecture\b|\bguest\s+session\b/i, value: 'seminar' },
];

// ── Date pattern (shared) ─────────────────────────────────────────────────────

const DATE_PAT =
  /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s+\d{4})?)/gi;

// ── Date parsing helpers ──────────────────────────────────────────────────────

/**
 * tryParseDate — attempt to parse various human date formats into ISO 8601.
 * Returns null on failure. Assumed year is current year if not present.
 */
function tryParseDate(raw: string): string | null {
  raw = raw.trim();

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const d = dmy[1] ?? '';
    const m = dmy[2] ?? '';
    const y = dmy[3] ?? '';
    const date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00.000Z`);
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // DD Month YYYY  or  Month DD, YYYY  or  DD Month
  const verbose = raw.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/i);
  if (verbose) {
    const d        = verbose[1] ?? '';
    const monthStr = verbose[2] ?? '';
    const y        = verbose[3];
    const m        = MONTH_MAP[monthStr.toLowerCase()];
    if (m) {
      const year = y ?? String(new Date().getFullYear());
      const date = new Date(`${year}-${m}-${d.padStart(2, '0')}T00:00:00.000Z`);
      if (!isNaN(date.getTime())) return date.toISOString();
    }
  }

  // Fallback: let JS Date try it (works for many English formats)
  const jsDate = new Date(raw);
  if (!isNaN(jsDate.getTime())) return jsDate.toISOString();

  return null;
}

/**
 * extractDates — scan for "deadline", "last date", "held on" keywords and extract adjacent dates.
 */
function extractDates(text: string): { deadline?: string; eventDate?: string } {
  const result: { deadline?: string; eventDate?: string } = {};

  // Deadline contexts
  const deadlineCtx = text.match(
    /(?:last\s+date|deadline|apply\s+by|submit\s+by|register\s+(?:by|before)|closes?\s+on)[^\n.]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s+\d{4})?)/gi,
  );
  if (deadlineCtx) {
    for (const ctx of deadlineCtx) {
      // Reset lastIndex because DATE_PAT uses /g flag
      DATE_PAT.lastIndex = 0;
      const matches = ctx.match(DATE_PAT);
      if (matches && matches.length > 0) {
        const last = matches[matches.length - 1];
        if (last) {
          const parsed = tryParseDate(last);
          if (parsed) { result.deadline = parsed; break; }
        }
      }
    }
  }

  // Event date contexts
  const eventCtx = text.match(
    /(?:held\s+on|event\s+(?:date|on)|on\s+date)[^\n.]*?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s+\d{4})?)/gi,
  );
  if (eventCtx) {
    for (const ctx of eventCtx) {
      DATE_PAT.lastIndex = 0;
      const matches = ctx.match(DATE_PAT);
      if (matches && matches.length > 0) {
        const last = matches[matches.length - 1];
        if (last) {
          const parsed = tryParseDate(last);
          if (parsed) { result.eventDate = parsed; break; }
        }
      }
    }
  }

  return result;
}

// ── Field extractors ──────────────────────────────────────────────────────────

function extractType(text: string): EventType | undefined {
  for (const { pattern, value } of TYPE_KEYWORDS) {
    if (pattern.test(text)) return value;
  }
  return undefined;
}

function extractTitle(text: string): string | undefined {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.length >= 5 && line.length <= 200 && !/^(dear|to|from|subject|date):/i.test(line)) {
      return line;
    }
  }
  return undefined;
}

function extractFee(text: string): string | undefined {
  const m = text.match(/(?:fee|entry\s+fee|registration\s+fee)[:\s]*(?:₹|rs\.?|inr)?\s*(\d[\d,]*)/i);
  if (m && m[1]) return `₹${m[1].replace(/,/g, '')}`;

  if (/\bfree\s+(?:of\s+cost|registration|entry|event)\b|\bno\s+(?:registration\s+)?fee\b/i.test(text)) {
    return 'Free';
  }

  const rupee = text.match(/₹\s*(\d[\d,]*)/);
  if (rupee && rupee[1]) return `₹${rupee[1].replace(/,/g, '')}`;

  return undefined;
}

function extractLink(text: string): string | undefined {
  const m = text.match(/https?:\/\/[^\s<>"']+/);
  return m ? m[0].replace(/[.,;)\]]+$/, '') : undefined;
}

function extractTeamSize(text: string): { min: number; max: number } | undefined {
  const range = text.match(/team\s+(?:of|size)\s+(\d+)\s*(?:to|-)\s*(\d+)/i)
    ?? text.match(/(\d+)\s+to\s+(\d+)\s+(?:members?|participants?)/i);
  if (range && range[1] && range[2]) {
    return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
  }

  const solo = text.match(/(?:solo|individual)\s+(?:event|participation)/i);
  if (solo) return { min: 1, max: 1 };

  const maxOnly = text.match(/(?:max(?:imum)?|upto|up\s+to)\s+(\d+)\s+(?:members?|participants?)/i);
  if (maxOnly && maxOnly[1]) return { min: 1, max: parseInt(maxOnly[1], 10) };

  return undefined;
}

function extractBranches(text: string): string[] | undefined {
  const found = new Set<string>();
  const lower = text.toLowerCase();

  for (const [keyword, code] of Object.entries(BRANCH_KEYWORDS)) {
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escapedKeyword}\\b`, 'i').test(lower)) {
      found.add(code);
    }
  }

  if (/\ball\s+(?:branches|departments|students)\b/i.test(text)) return [];

  return found.size > 0 ? Array.from(found) : undefined;
}

function extractYears(text: string): number[] | undefined {
  const found = new Set<number>();

  const ordinals = text.matchAll(/\b([1-4])(?:st|nd|rd|th)\s+year\b/gi);
  for (const m of ordinals) {
    if (m[1]) found.add(parseInt(m[1], 10));
  }

  const yearList = text.match(/\byear(?:s)?\s*[:\-]?\s*([\d,\s&and]+)/i);
  if (yearList && yearList[1]) {
    for (const n of yearList[1].matchAll(/\b([1-4])\b/g)) {
      if (n[1]) found.add(parseInt(n[1], 10));
    }
  }

  if (/\ball\s+years?\b/i.test(text)) return [];

  return found.size > 0 ? Array.from(found).sort() : undefined;
}

function extractSummary(text: string): string | undefined {
  const paragraphs = text.split(/\r?\n\r?\n/).map((p) => p.trim()).filter(Boolean);
  for (const p of paragraphs) {
    if (p.length >= 30 && p.length <= 600) {
      const words = p.split(/\s+/);
      if (words.length > 100) return words.slice(0, 100).join(' ') + '…';
      return p;
    }
  }
  return undefined;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * regexExtract — deterministic field extraction using regex patterns.
 *
 * Always returns a (possibly empty) partial result. Never throws.
 * Used in parallel with the LLM call for research evaluation.
 */
export function regexExtract(rawMessage: string): ExtractedEventFields {
  try {
    const result: ExtractedEventFields = {};

    const title = extractTitle(rawMessage);
    if (title) result.title = title;

    const type = extractType(rawMessage);
    if (type) result.type = type;

    const { deadline, eventDate } = extractDates(rawMessage);
    if (deadline)  result.deadline  = deadline;
    if (eventDate) result.eventDate = eventDate;

    const fee = extractFee(rawMessage);
    if (fee) result.fee = fee;

    const link = extractLink(rawMessage);
    if (link) result.link = link;

    const teamSize = extractTeamSize(rawMessage);
    if (teamSize) result.teamSize = teamSize;

    const branches = extractBranches(rawMessage);
    const years    = extractYears(rawMessage);
    // Default to open-to-all ([] = no restriction) when the announcement
    // doesn't mention specific branches or years. Only set specific lists
    // when the regex found actual restrictions.
    result.eligibility = {
      branches: branches ?? [],  // null = "all branches" → []
      years:    years    ?? [],  // null = "all years"    → []
    };

    const summary = extractSummary(rawMessage);
    if (summary) result.summary = summary;

    return result;
  } catch {
    return {};
  }
}
