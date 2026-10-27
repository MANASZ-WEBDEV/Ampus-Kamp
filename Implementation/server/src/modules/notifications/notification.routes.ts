import { Router } from 'express';
import { requireAuth } from '@/shared/middleware/auth';
import { listNotifications, markNotificationRead } from './notification.controller';

const router = Router();

// All authenticated users can view and mark their own notifications
router.get(  '/',           requireAuth, listNotifications);
router.patch('/:id/read',   requireAuth, markNotificationRead);

export { router as notificationsRouter };
