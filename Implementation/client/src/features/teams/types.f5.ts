// ── F-5: People Search + Looking + Safety ────────────────────────────────────

// ── People ────────────────────────────────────────────────────────────────────

export interface Person {
  id:           string;
  name:         string;
  department:   { id: string; code: string; name: string };
  year?:        number;
  skills:       string[];
  allowInvites: boolean;
  // Only present when eventId was passed in the search query
  isLooking?:   boolean;
}

export interface PeopleQuery {
  skills?:  string;   // comma-separated
  branch?:  string;   // dept code: "CSE", "ECE"
  year?:    number;
  eventId?: string;   // enables isLooking annotation
  limit?:   number;
  cursor?:  string;
}

export interface PeoplePage {
  items:       Person[];
  nextCursor?: string;
  hasMore:     boolean;
}

// ── Looking Flag ──────────────────────────────────────────────────────────────

export interface LookingCard {
  id:    string;
  user:  { id: string; name: string };
  note?: string;
  since: string;
}

export interface ToggleResult {
  isLooking: boolean;
  flag?:     LookingCard;
}

export interface LookingPage {
  items:       LookingCard[];
  nextCursor?: string;
  hasMore:     boolean;
}

// ── Safety ────────────────────────────────────────────────────────────────────

export interface BlockCard {
  id:          string;
  blockedUser: { id: string; name: string };
  createdAt:   string;
}

export interface CreateBlockInput {
  blockedUserId: string;
}

export interface CreateReportInput {
  targetUserId?: string;
  linkId?:       string;
  reason:        string;
}
