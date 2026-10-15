import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import type { AuthUser } from '@/shared/types';

/**
 * Sign a JWT for the given user payload.
 * Expiry comes from env.JWT_EXPIRES_IN (default "30d").
 */
export function signToken(payload: AuthUser): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verify a JWT and return the decoded payload.
 * Throws JsonWebTokenError / TokenExpiredError on failure — caught by errorHandler.
 */
export function verifyToken(token: string): AuthUser {
  return jwt.verify(token, env.JWT_SECRET) as AuthUser;
}
