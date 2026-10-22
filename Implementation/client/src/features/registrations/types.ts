// ── F-6: Event Registration — Client Types ────────────────────────────────────

export type MemberStatus      = 'invited' | 'confirmed' | 'declined';
export type RegistrationType  = 'individual' | 'team' | 'tracking';
export type RegistrationStatus = 'draft' | 'submitted' | 'withdrawn' | 'locked';

export interface Member {
  userId:      string;
  name:        string;
  status:      MemberStatus;
  respondedAt?: string;
}

export interface Registration {
  id:             string;
  eventId:        string;
  type:           RegistrationType;
  status:         RegistrationStatus;
  teamName?:      string;
  leader:         { id: string; name: string };
  members:        Member[];
  externalRegId?: string;
  submittedAt?:   string;
  createdAt:      string;
}

// ── Input shapes ──────────────────────────────────────────────────────────────

export interface CreateRegistrationInput {
  type:           RegistrationType;
  teamName?:      string;
  memberUserIds?: string[];
  externalRegId?: string;
}

export interface UpdateRegistrationInput {
  action:         'submit' | 'withdraw' | 'edit';
  teamName?:      string;
  memberUserIds?: string[];
}

export interface MemberRespondInput {
  action: 'confirm' | 'decline';
}

export interface CreateTrackingInput {
  externalRegId?: string;
}

// ── Paginated response ────────────────────────────────────────────────────────

export interface RegistrationPage {
  items:       Registration[];
  nextCursor?: string;
  hasMore:     boolean;
}
