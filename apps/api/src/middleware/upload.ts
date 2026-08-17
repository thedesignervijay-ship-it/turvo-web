import multer from 'multer';
import type { Request, RequestHandler } from 'express';
import { badRequest, validationError } from '../lib/errors.js';

/**
 * In-memory file upload middleware for turf images (spec section 10:
 * JPEG/PNG/WebP, maximum 5 MB). Multer errors are mapped to the spec error
 * format instead of leaking the raw message.
 */
export const uploadImage: RequestHandler = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(badRequest('Only JPEG, PNG and WebP images are allowed.'));
  },
}).single('image');

/** Maps multer's code-based errors (e.g. LIMIT_FILE_SIZE) to AppErrors. */
export function imageUploadErrorHandler(
  err: unknown,
  _req: Request,
  _res: unknown,
  next: (err?: unknown) => void,
): void {
  if (err && typeof err === 'object' && (err as { code?: string }).code === 'LIMIT_FILE_SIZE') {
    next(badRequest('Image must be 5 MB or smaller.'));
    return;
  }
  if (err && typeof err === 'object' && (err as { code?: string }).code === 'LIMIT_UNEXPECTED_FILE') {
    next(validationError('Exactly one image file field named "image" is required.'));
    return;
  }
  next(err);
}
