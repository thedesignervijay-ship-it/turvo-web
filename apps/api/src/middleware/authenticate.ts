import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '../lib/jwt.js';
import { accountInactive, invalidToken, unauthorized } from '../lib/errors.js';
import type { UserRepo } from '../repositories/user.repo.js';
import type { OwnerRepo } from '../repositories/owner.repo.js';

/**
 * Authenticates the request by verifying the Bearer access token against the
 * Supabase Auth JWT secret, then resolves the application user. The token's
 * role claim is never trusted; RBAC uses the users table role.
 */
export function createAuthenticate(userRepo: UserRepo, ownerRepo: OwnerRepo) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const header = req.headers.authorization;
      if (!header || !header.startsWith('Bearer ')) {
        next(unauthorized('Access token required.'));
        return;
      }
      const token = header.slice('Bearer '.length).trim();
      if (!token) {
        next(unauthorized('Access token required.'));
        return;
      }

      let sub: string;
      try {
        const payload = await verifyAccessToken(token);
        sub = payload.sub ?? '';
      } catch {
        next(invalidToken());
        return;
      }
      if (!sub) {
        next(invalidToken());
        return;
      }

      const user = await userRepo.findByAuthUserId(sub);
      if (!user) {
        next(unauthorized('Account not found.'));
        return;
      }
      if (user.status === 'INACTIVE') {
        next(accountInactive());
        return;
      }

      const ownerRow =
        user.role === 'OWNER' ? await ownerRepo.findByUserId(user.id) : null;

      req.auth = {
        user: {
          id: user.id,
          authUserId: user.auth_user_id ?? sub,
          role: user.role,
          name: user.name,
          email: user.email,
          phone: user.phone,
          status: user.status,
        },
        owner: ownerRow
          ? {
              id: ownerRow.id,
              userId: ownerRow.user_id,
              businessName: ownerRow.business_name,
              status: ownerRow.status,
            }
          : null,
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}
