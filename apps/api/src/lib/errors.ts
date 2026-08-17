/**
 * Standard application errors.
 * Response shape (spec section 30):
 *   { success: false, error: { code, message, details? } }
 */

export class AppError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message = 'Bad request'): AppError =>
  new AppError('BAD_REQUEST', message, 400);

export const unauthorized = (message = 'Authentication required'): AppError =>
  new AppError('UNAUTHORIZED', message, 401);

export const invalidToken = (): AppError =>
  new AppError('UNAUTHORIZED', 'Invalid or expired token.', 401);

export const forbidden = (message = 'You do not have permission to perform this action.'): AppError =>
  new AppError('FORBIDDEN', message, 403);

export const accountInactive = (): AppError =>
  new AppError('ACCOUNT_INACTIVE', 'Your account has been deactivated.', 403);

export const notFound = (message = 'Resource not found.'): AppError =>
  new AppError('NOT_FOUND', message, 404);

export const conflict = (message = 'Conflict with the current state of the resource.', code = 'CONFLICT'): AppError =>
  new AppError(code, message, 409);

export const alreadyExists = (message = 'A record with the same details already exists.'): AppError =>
  new AppError('ALREADY_EXISTS', message, 409);

export const bookingConflict = (message = 'The selected slot is no longer available.'): AppError =>
  new AppError('BOOKING_CONFLICT', message, 409);

export const pricingConflict = (message = 'An active pricing rule already covers this slot.'): AppError =>
  new AppError('PRICING_CONFLICT', message, 409);

export const validationError = (message = 'Validation failed.', details?: unknown): AppError =>
  new AppError('VALIDATION_ERROR', message, 422, details);

export const invalidStateTransition = (message = 'The requested action is not allowed in the current state.'): AppError =>
  new AppError('INVALID_STATE', message, 409);

export const rateLimited = (message = 'Too many requests. Please try again later.'): AppError =>
  new AppError('RATE_LIMITED', message, 429);

export const internalError = (message = 'An unexpected error occurred.'): AppError =>
  new AppError('INTERNAL', message, 500);

export const serviceUnavailable = (message = 'Service temporarily unavailable.'): AppError =>
  new AppError('SERVICE_UNAVAILABLE', message, 503);
