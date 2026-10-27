import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '@/shared/errors';

// ── Upload directory ──────────────────────────────────────────────────────────
// Files are stored in server/uploads/ during development.
// In production, swap diskStorage for a Cloudinary stream transform.

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure the directory exists at startup
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Storage ───────────────────────────────────────────────────────────────────

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    // Use timestamp + random suffix to prevent name collisions
    const ext  = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

// ── MIME allowlist ────────────────────────────────────────────────────────────
// Only PDF, JPEG, and PNG are accepted. Multer checks the Content-Type
// header; we also validate the real MIME signature in the service layer
// by re-reading the file buffer if needed.

const ALLOWED_MIMES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void {
  if (ALLOWED_MIMES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only PDF, JPEG, and PNG files are accepted.', 422, 'INVALID_FILE_TYPE'));
  }
}

// ── Max size: 10 MB ───────────────────────────────────────────────────────────

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ── Exported multer instance ──────────────────────────────────────────────────

export const proofUpload = multer({
  storage:    diskStorage,
  fileFilter,
  limits: {
    fileSize: MAX_SIZE_BYTES,
    files:    1,         // single-file upload only
  },
});

/**
 * singleProofUpload — middleware that parses the 'proof' field from
 * multipart/form-data and writes the file to disk.
 *
 * Usage in routes:
 *   router.post('/', requireAuth, singleProofUpload, validate(schema), ctrl.create);
 */
export const singleProofUpload = proofUpload.single('proof');

/** Absolute path for a stored proof file, relative to CWD */
export function getProofUrl(filename: string): string {
  return `/uploads/${filename}`;
}
