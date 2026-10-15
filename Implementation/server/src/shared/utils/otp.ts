import crypto from 'node:crypto';

/** Generate a cryptographically random 6-digit OTP code, zero-padded. */
export function generateOtpCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

/**
 * Hash a 6-digit OTP code with SHA-256.
 * We use SHA-256 (not bcrypt) because:
 *   - OTPs are already random high-entropy strings
 *   - We need fast constant-time comparison (no adaptive cost)
 *   - bcrypt is designed for low-entropy passwords, not random codes
 */
export function hashOtpCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/** Constant-time comparison to prevent timing attacks. */
export function verifyOtpCode(code: string, storedHash: string): boolean {
  const inputHash = hashOtpCode(code);
  // Both must be the same length for timingSafeEqual
  const a = Buffer.from(inputHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** OTP TTL in milliseconds (10 minutes). */
export const OTP_TTL_MS = 10 * 60 * 1000;
/** Maximum failed attempts before the OTP record is invalidated. */
export const OTP_MAX_ATTEMPTS = 3;
