// ── Shared event types — mirrors the server's event.service.ts shape ──────────

export type EventType =
  | 'hackathon'
  | 'competition'
  | 'sports'
  | 'workshop'
  | 'seminar'
  | 'other';

export type EventStatus = 'draft' | 'published' | 'closed' | 'archived';

export type RegistrationMode = 'in_app' | 'external';

export interface EventPoster {
  id: string;
  name: string;
}

export interface EventEligibility {
  branches: string[];
  years: number[];
  notes?: string;
}

export interface EventTeamSize {
  min: number;
  max: number;
}

export interface EventCounters {
  students: number;
  teams: number;
  tracking: number;
}

/** Shape returned in the feed list and event detail */
export interface EventCard {
  id: string;
  title: string;
  type: EventType;
  organizer?: string;
  deadline?: string;        // ISO string — parse with new Date()
  eventDate?: string;
  eligibility: EventEligibility;
  teamSize: EventTeamSize;
  fee?: string;
  link?: string;
  summary?: string;
  registrationMode: RegistrationMode;
  registrationDeadline?: string;
  counters: EventCounters;
  status: EventStatus;
  postedBy: EventPoster;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Full event detail — includes rawMessage for faculty who own the event */
export interface EventDetail extends EventCard {
  rawMessage?: string;
}

/** Shape for creating / updating an event */
export interface CreateEventInput {
  title: string;
  type: EventType;
  organizer?: string;
  deadline?: string;
  eventDate?: string;
  eligibility?: {
    branches?: string[];
    years?: number[];
    notes?: string;
  };
  teamSize?: { min: number; max: number };
  fee?: string;
  link?: string;
  summary?: string;
  registrationMode?: RegistrationMode;
  registrationDeadline?: string;

  // ── F-3: Paste-to-Post metadata (only set when created via extraction) ──────
  /** Original pasted announcement text — stored server-side, never shown to students */
  rawMessage?: string;
  /** AI extraction metadata for audit / research */
  extraction?: {
    model?: string;
    promptVersion?: string;
    editedFields: string[];
    usedFallback: boolean;
  };
}

export type UpdateEventInput = Partial<CreateEventInput>;

/** Feed query params */
export interface EventsQuery {
  type?: EventType[];
  branch?: string[];
  year?: number[];
  status?: EventStatus[];
  cursor?: string;
  limit?: number;
}

/** Paginated feed response */
export interface EventFeedPage {
  items: EventCard[];
  nextCursor?: string;
  hasMore: boolean;
}

// ── F-3: Extraction types ─────────────────────────────────────────────────────

/** Fields that the AI extraction can populate — mirrors ExtractedEventFields on server */
export interface ExtractedFields {
  title?: string | null;
  type?: EventType | null;
  organizer?: string | null;
  deadline?: string | null;      // ISO8601
  eventDate?: string | null;     // ISO8601
  eligibility?: {
    branches: string[];
    years: number[];
  } | null;
  teamSize?: {
    min: number;
    max: number;
  } | null;
  fee?: string | null;
  link?: string | null;
  summary?: string | null;
}

/** Result returned by POST /api/v1/events/extract */
export interface ExtractionResult {
  extracted: ExtractedFields;
  uncertainFields: string[];   // field names that are null / uncertain
  usedFallback: boolean;       // true if LLM failed and regex was used
  regexExtracted?: ExtractedFields; // for research comparison (optional)
}
