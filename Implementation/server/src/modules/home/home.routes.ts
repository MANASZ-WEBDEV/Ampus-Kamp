import { Router }      from 'express';
import { requireAuth } from '@/shared/middleware/auth';
import { getHome }     from './home.controller';

const router = Router();

// All authenticated users have a home feed
router.get('/', requireAuth, getHome);

export { router as homeRouter };
