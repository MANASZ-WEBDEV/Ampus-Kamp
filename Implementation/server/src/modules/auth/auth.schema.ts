import { z } from 'zod';

// ── Register ─────────────────────────────────────────────────────────────────

export const registerSchema = z.object({
  enrollmentNo: z
    .string()
    .min(4)
    .max(20)
    .trim()
    .toUpperCase(),
  collegeId: z.string().min(1).max(30).trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
});

export type RegisterBody = z.infer<typeof registerSchema>;

// ── Verify OTP ───────────────────────────────────────────────────────────────

export const verifyOtpSchema = z.object({
  userId: z.string().length(24, 'Invalid userId'),
  code: z
    .string()
    .length(6, 'OTP must be exactly 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only digits'),
});

export type VerifyOtpBody = z.infer<typeof verifyOtpSchema>;

// ── Login ─────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  enrollmentNo: z.string().min(4).max(20).trim().toUpperCase(),
  password: z.string().min(1),
});

export type LoginBody = z.infer<typeof loginSchema>;

// ── Resend OTP ───────────────────────────────────────────────────────────────

export const resendOtpSchema = z.object({
  userId: z.string().length(24, 'Invalid userId'),
});

export type ResendOtpBody = z.infer<typeof resendOtpSchema>;
