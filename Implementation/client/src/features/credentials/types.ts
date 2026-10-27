// ── F-7: Credentials & Verification — Client Types ───────────────────────────

export type CredVerifStatus = 'pending' | 'verified' | 'rejected';
export type CredVerifMethod = 'issuer_qr' | 'faculty' | 'admin';
export type CredTier        = 'pass' | 'elite' | 'elite_silver' | 'elite_gold';

// ── Course ────────────────────────────────────────────────────────────────────

export interface Course {
  _id:                string;
  issuer:             string;
  name:               string;
  code?:              string;
  category:           string;
  language?:          string;
  aliases:            string[];
  verificationMethod: 'issuer_qr' | 'faculty' | 'manual';
  active:             boolean;
}

// ── Credential ────────────────────────────────────────────────────────────────

export interface Verification {
  status:      CredVerifStatus;
  method:      CredVerifMethod;
  verifiedBy?: string;
  verifiedAt?: string;
  reason?:     string;
  evidence?:   string;
}

export interface Credential {
  _id:             string;
  studentId:       string;
  department:      string;
  courseId?:       string;
  otherCourseName?: string;
  issuer:          string;
  session:         string;
  year:            number;
  tier:            CredTier;
  certificateId:   string;
  proofUrl:        string;
  proofHash:       string;
  verification:    Verification;
  createdAt:       string;
  updatedAt:       string;
}

// ── Participation ─────────────────────────────────────────────────────────────

export type ParticipationResult = 'winner' | 'runner_up' | 'participant' | 'finisher';

export interface Participation {
  _id:             string;
  studentId:       string;
  eventId:         string;
  registrationId?: string;
  teamName?:       string;
  members:         Array<{ userId: string; department: string }>;
  result:          ParticipationResult;
  resultNote?:     string;
  proofUrl:        string;
  proofHash:       string;
  verification:    Verification;
  createdAt:       string;
  updatedAt:       string;
}

// ── Input shapes ──────────────────────────────────────────────────────────────

export interface CreateCredentialInput {
  courseId?:       string;
  otherCourseName?: string;
  issuer:          string;
  session:         string;
  year:            number;
  tier:            CredTier;
  certificateId:   string;
  proof:           File;   // the uploaded file
}

export interface EditCredentialInput {
  session?:       string;
  year?:          number;
  tier?:          CredTier;
  certificateId?: string;
}

export interface VerifyCredentialInput {
  verdict: 'verified' | 'rejected';
  reason?: string;
}

export interface CreateParticipationInput {
  eventId:         string;
  registrationId?: string;
  teamName?:       string;
  members?:        Array<{ userId: string; department: string }>;
  result:          ParticipationResult;
  resultNote?:     string;
  proof:           File;
}

export interface VerifyParticipationInput {
  verdict: 'verified' | 'rejected';
  reason?: string;
}
