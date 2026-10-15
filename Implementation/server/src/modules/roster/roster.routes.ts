import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '@/shared/middleware';
import { importRosterHandler } from './roster.controller';

// Memory storage — CSV is parsed directly from buffer, no disk write
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv files are accepted.'));
    }
  },
});

export const rosterRouter = Router();

// Admin only — bulk import
rosterRouter.post(
  '/import',
  requireAuth,
  requireRole(['admin']),
  upload.single('file'),
  importRosterHandler,
);
