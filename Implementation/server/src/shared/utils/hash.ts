import { createHash } from 'crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

/**
 * Hash a plaintext password with bcrypt.
 * 12 rounds is the OWASP-recommended minimum for 2024+.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Compare a plaintext password against a bcrypt hash.
 * Always use this — never compare hashes directly (timing-safe).
 */
export async function comparePassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Compute a SHA-256 hex digest.
 * Used for proof-file deduplication (Credential.proofHash).
 *
 * IMPORTANT: always compute server-side from the raw buffer.
 * Never trust a hash value sent by the client.
 */
export function sha256(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}
