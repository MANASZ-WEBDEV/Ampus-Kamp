// ── F-4: Team Finder — Posts & Requests ──────────────────────────────────────

export type TeamPostStatus = 'open' | 'full' | 'closed' | 'expired';
export type LinkDirection  = 'request' | 'invite' | 'connect';
export type LinkStatus     = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired';

// ── TeamPost ──────────────────────────────────────────────────────────────────

export interface TeamPostOwner {
  id:   string;
  name: string;
}

export interface TeamPost {
  id:          string;
  eventId:     string;
  owner:       TeamPostOwner;
  title:       string;
  description: string;
  rolesNeeded: string[];
  spotsTotal:  number;
  spotsLeft:   number;
  status:      TeamPostStatus;
  expiresAt:   string;
  createdAt:   string;
  isOwner:     boolean;
}

// ── TeamLink ──────────────────────────────────────────────────────────────────

export interface LinkUser {
  id:   string;
  name: string;
}

export interface ContactReveal {
  phone: string;
}

export interface ContactHint {
  hint: string;
}

export interface TeamLink {
  id:          string;
  direction:   LinkDirection;
  status:      LinkStatus;
  from:        LinkUser;
  to:          LinkUser;
  eventId?:    string;
  teamPostId?: string;
  message?:    string;
  expiresAt:   string;
  respondedAt?: string;
  createdAt:   string;
  // Present only when status='accepted'
  contact?: ContactReveal | ContactHint;
}

// ── API request shapes ────────────────────────────────────────────────────────

export interface CreateTeamPostInput {
  eventId:      string;
  title:        string;
  description?: string;
  rolesNeeded:  string[];
  spotsTotal:   number;
}

export interface UpdateTeamPostInput {
  title?:       string;
  description?: string;
  rolesNeeded?: string[];
  status?:      'closed';
}

export interface SendLinkInput {
  direction:   LinkDirection;
  teamPostId?: string;  // for request
  toUserId?:   string;  // for invite / connect
  eventId?:    string;
  message?:    string;
}

export type RespondLinkAction = 'accept' | 'decline' | 'withdraw';

// ── API response shapes ───────────────────────────────────────────────────────

export interface TeamPostsResponse {
  data: TeamPost[];
}

export interface TeamLinksPage {
  items:      TeamLink[];
  nextCursor?: string;
  hasMore:    boolean;
}

// ── Type guards ───────────────────────────────────────────────────────────────

export function isContactReveal(c: ContactReveal | ContactHint): c is ContactReveal {
  return 'phone' in c;
}
