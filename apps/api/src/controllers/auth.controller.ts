import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../lib/http.js';
import { serializeOwner } from '../serializers/owner.js';
import { serializeUser } from '../serializers/user.js';
import type { AuthService } from '../services/auth.service.js';

export function createAuthController(authService: AuthService) {
  return {
    register: async (req: Request, res: Response): Promise<void> => {
      const { user, owner } = await authService.register(req.validated!.body as never);
      sendCreated(
        res,
        { user: serializeUser(user), owner: serializeOwner(owner) },
        'Owner registered successfully.',
      );
    },

    me: async (req: Request, res: Response): Promise<void> => {
      const { user, owner, permissions } = await authService.me(req.auth!.user.authUserId);
      sendSuccess(res, {
        user: serializeUser(user),
        owner: owner ? serializeOwner(owner) : null,
        permissions,
      });
    },

    logout: async (_req: Request, res: Response): Promise<void> => {
      await authService.logout();
      sendSuccess(res, null, 'Logged out successfully.');
    },
  };
}
