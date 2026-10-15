import { Router } from 'express';
import { requireAuth } from '@/shared/middleware';
import { validate } from '@/shared/middleware';
import { updateMeSchema } from './user.schema';
import * as ctrl from './user.controller';

export const usersRouter = Router();

// All routes require auth
usersRouter.use(requireAuth);

usersRouter.get('/me', ctrl.getMe);
usersRouter.put('/me', validate(updateMeSchema), ctrl.updateMe);
usersRouter.get('/:id', ctrl.getUserById);
