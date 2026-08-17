import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { forbidden, unauthorized } from '../lib/errors.js';
import { hasPermission, type Permission } from '../lib/rbac.js';

/**
 * Grants access when the authenticated user's role holds ANY of the required
 * permissions (spec section 6). Must run after the authenticate middleware.
 */
export function authorize(...required: Permission[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(unauthorized());
      return;
    }
    if (!hasPermission(req.auth.user.role, required)) {
      next(forbidden());
      return;
    }
    next();
  };
}

/**
 * Asserts the authenticated user is a turf owner. Throws 403 otherwise.
 */
export function requireOwner(req: Request): void {
  if (!req.auth) throw unauthorized();
  if (req.auth.user.role !== 'OWNER' || !req.auth.owner) throw forbidden();
}
