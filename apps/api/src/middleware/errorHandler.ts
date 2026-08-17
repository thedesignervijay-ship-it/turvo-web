import type { ErrorRequestHandler, Request } from 'express';
import { ZodError } from 'zod';
import { AppError, rateLimited, validationError } from '../lib/errors.js';

const PG_CODE_RE = /^[0-9]{5}$/;

function isPgError(err: unknown): err is { code: string; constraint?: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    typeof (err as { code?: unknown }).code === 'string' &&
    PG_CODE_RE.test((err as { code: string }).code)
  );
}

function pgErrorResponse(err: { code: string; constraint?: string }): AppError {
  switch (err.code) {
    case '23P01': // exclusion violation -> double booking
      return new AppError(
        'BOOKING_CONFLICT',
        'The selected slot is no longer available.',
        409,
      );
    case '23505':
      return new AppError(
        'ALREADY_EXISTS',
        'A record with the same details already exists.',
        409,
      );
    case '23503':
      return new AppError('INVALID_REFERENCE', 'The referenced record does not exist.', 400);
    case '23514':
      return new AppError('VALIDATION_ERROR', 'The value violates a database rule.', 422);
    case '22P02':
    case '22007':
    case '22008':
      return new AppError('VALIDATION_ERROR', 'The value is not valid.', 422);
    default:
      return new AppError('DATABASE_ERROR', 'A database error occurred.', 500);
  }
}

function errorBody(err: AppError): Record<string, unknown> {
  const body: Record<string, unknown> = {
    success: false,
    error: { code: err.code, message: err.message },
  };
  if (err.details !== undefined) {
    (body.error as Record<string, unknown>).details = err.details;
  }
  return body;
}

/**
 * Central error handler. Maps known error types to the spec response format
 * and never leaks internal error details to clients (spec section 38).
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  let mapped: AppError;

  if (err instanceof AppError) {
    mapped = err;
  } else if (err instanceof ZodError) {
    mapped = validationError(
      'Validation failed.',
      err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    );
  } else if (isPgError(err)) {
    mapped = pgErrorResponse(err);
  } else if (typeof err === 'object' && err !== null && (err as { statusCode?: unknown }).statusCode === 429) {
    mapped = rateLimited();
  } else if (
    typeof err === 'object' &&
    err !== null &&
    (err as { type?: unknown }).type === 'entity.parse.failed'
  ) {
    mapped = validationError('Request body is not valid JSON.');
  } else {
    // eslint-disable-next-line no-console
    console.error(
      `[error] ${req.method} ${req.originalUrl}:`,
      err instanceof Error ? err.message : String(err),
    );
    mapped = new AppError('INTERNAL', 'An unexpected error occurred.', 500);
  }

  if (mapped.status >= 500) {
    // eslint-disable-next-line no-console
    console.error(
      `[error] ${req.method} ${req.originalUrl}:`,
      mapped.message,
      err instanceof Error ? `(${err.message})` : '',
    );
  }

  res.status(mapped.status).json(errorBody(mapped));
};
