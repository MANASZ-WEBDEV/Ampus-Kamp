// ── Home API types ────────────────────────────────────────────────────────────

export interface HomeUser {
  name:               string;
  branch:             string;
  year:               number | null;
  verifiedBadgeCount: number;
}

export interface EventSummary {
  id:       string;
  title:    string;
  deadline: string;  // ISO string
  type:     string;
}

export interface TeamPostSummary {
  id:             string;
  eventId:        string;
  title:          string;
  requiredSkills: string[];
}

export interface HomeData {
  user:                    HomeUser;
  unreadNotificationsFlag: boolean;
  hasSkillsMatch?:         boolean;
  pendingRequestCount?:    number;
  closingSoonEvents?:      EventSummary[];
  matchedTeamPosts?:       TeamPostSummary[];
}
