import { Router } from 'express';
import { requireAuth, requireRole, validate } from '@/shared/middleware';
import { peopleQuerySchema } from './people.schema';
import * as ctrl from './people.controller';

export const peopleRouter = Router();

// GET /api/v1/people — people search with optional isLooking annotation
peopleRouter.get(
  '/',
  requireAuth,
  requireRole(['student', 'faculty', 'dept_head', 'admin']),
  validate(peopleQuerySchema, 'query'),
  ctrl.searchPeople,
);
