import { Router } from 'express';
import { validate } from '@/shared/middleware';
import { loginLimiter, otpLimiter } from '@/shared/middleware';
import {
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  resendOtpSchema,
} from './auth.schema';
import * as ctrl from './auth.controller';

export const authRouter = Router();

// Public — no requireAuth
authRouter.post('/register', validate(registerSchema), ctrl.register);
authRouter.post('/verify-otp', otpLimiter, validate(verifyOtpSchema), ctrl.verifyOtp);
authRouter.post('/login', loginLimiter, validate(loginSchema), ctrl.login);
authRouter.post('/resend-otp', otpLimiter, validate(resendOtpSchema), ctrl.resendOtp);
authRouter.post('/logout', ctrl.logout); // clears cookie — no auth needed
