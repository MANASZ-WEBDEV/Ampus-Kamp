import { Router } from 'express';
import { requireAuth, requireRole } from '@/shared/middleware';
import { getSettings, putSettings } from './setting.controller';

export const settingsRouter = Router();

// Both routes admin-only — global settings are a privileged operation.
settingsRouter.get('/', requireAuth, requireRole(['admin']), getSettings);
settingsRouter.put('/', requireAuth, requireRole(['admin']), ...putSettings);
