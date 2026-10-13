import type { Request } from 'express';

// ── User roles ────────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'faculty' | 'dept_head' | 'admin';

export interface AuthUser {
  id: string;
  role: UserRole;
  department?: string; // ObjectId string
  name: string;
  status: 'pending' | 'active' | 'suspended';
}

// ── Express request extensions ────────────────────────────────────────────────

export interface AuthRequest extends Request {
  user: AuthUser; // Asserted present after requireAuth middleware
}

// ── API response shapes ───────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, string>;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}

// ── Common field types ────────────────────────────────────────────────────────

export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type RegistrationStatus = 'draft' | 'submitted' | 'withdrawn' | 'locked';
export type EventStatus = 'draft' | 'published' | 'closed' | 'archived';
export type LinkStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn' | 'expired';
export type LinkDirection = 'request' | 'invite' | 'connect';
