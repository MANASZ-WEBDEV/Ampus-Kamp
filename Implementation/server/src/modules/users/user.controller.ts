import type { Response } from 'express';
import { asyncHandler } from '@/shared/utils';
import type { AuthRequest } from '@/shared/types';
import * as userService from './user.service';

export const getMe = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const data = await userService.getMe(req.user);
  res.status(200).json({ data });
});

export const updateMe = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const data = await userService.updateMe(req.user, req.body);
  res.status(200).json({ data });
});

export const getUserById = asyncHandler<AuthRequest>(async (req, res: Response) => {
  const data = await userService.getUserById(req.user, req.params['id'] ?? '');
  res.status(200).json({ data });
});
