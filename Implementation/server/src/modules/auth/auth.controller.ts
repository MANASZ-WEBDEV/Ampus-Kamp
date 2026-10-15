import type { Request, Response } from 'express';
import { asyncHandler } from '@/shared/utils';
import { setAuthCookie, clearAuthCookie } from '@/shared/utils';
import * as authService from './auth.service';

// ── POST /api/v1/auth/register ────────────────────────────────────────────────

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  res.status(201).json({ data: result });
});

// ── POST /api/v1/auth/verify-otp ─────────────────────────────────────────────

export const verifyOtp = asyncHandler(async (req: Request, res: Response) => {
  const { token, user } = await authService.verifyOtp(req.body);
  setAuthCookie(res, token);
  res.status(200).json({ data: { token, user } });
});

// ── POST /api/v1/auth/login ───────────────────────────────────────────────────

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { token, user } = await authService.login(req.body);
  setAuthCookie(res, token);
  res.status(200).json({ data: { token, user } });
});

// ── POST /api/v1/auth/resend-otp ─────────────────────────────────────────────

export const resendOtp = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.resendOtp(req.body);
  res.status(200).json({ data: result });
});

// ── POST /api/v1/auth/logout ──────────────────────────────────────────────────

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.status(200).json({ data: { message: 'Logged out successfully.' } });
});
