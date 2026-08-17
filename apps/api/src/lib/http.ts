import type { Response } from 'express';
import type { PaginationMeta } from './pagination.js';

/**
 * Success envelope (spec section 30):
 *   { success: true, data, message, pagination? }
 */

export function sendSuccess(
  res: Response,
  data: unknown,
  message = 'Success',
  status = 200,
): void {
  res.status(status).json({ success: true, data, message });
}

export function sendPaginated(
  res: Response,
  data: unknown,
  pagination: PaginationMeta,
  message = 'Success',
): void {
  res.status(200).json({ success: true, data, message, pagination });
}

export function sendCreated(
  res: Response,
  data: unknown,
  message = 'Resource created successfully.',
): void {
  sendSuccess(res, data, message, 201);
}
