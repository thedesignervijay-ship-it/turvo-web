import type { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '../lib/http.js';
import { serializeOwner, serializeOwnerWithUser } from '../serializers/owner.js';
import { serializeUser } from '../serializers/user.js';
import type { OwnerService } from '../services/owner.service.js';
import type { z } from 'zod';
import type { listOwnersQuerySchema } from '../validations/owner.schema.js';

type OwnerListQuery = z.output<typeof listOwnersQuerySchema>;

function actorOf(req: Request): { id: string; ip: string | null; userAgent: string | null } {
  return {
    id: req.auth!.user.id,
    ip: req.ip ?? null,
    userAgent: req.headers['user-agent'] ?? null,
  };
}

function idOf(req: Request): string {
  return String(req.params.id);
}

export function createOwnerController(ownerService: OwnerService) {
  return {
    getProfile: async (req: Request, res: Response): Promise<void> => {
      const { user, owner } = await ownerService.getProfile(req.auth!.user.id);
      sendSuccess(res, { user: serializeUser(user), owner: owner ? serializeOwner(owner) : null });
    },

    updateProfile: async (req: Request, res: Response): Promise<void> => {
      const { user, owner } = await ownerService.updateProfile(req.auth!.user.id, req.validated!.body as never);
      sendSuccess(res, { user: serializeUser(user), owner: owner ? serializeOwner(owner) : null }, 'Profile updated successfully.');
    },

    list: async (req: Request, res: Response): Promise<void> => {
      const { items, pagination } = await ownerService.listOwners(req.validated!.query as unknown as OwnerListQuery);
      sendPaginated(res, items.map(serializeOwnerWithUser), pagination);
    },

    get: async (req: Request, res: Response): Promise<void> => {
      const owner = await ownerService.getOwner(idOf(req));
      sendSuccess(res, serializeOwnerWithUser(owner));
    },

    update: async (req: Request, res: Response): Promise<void> => {
      const owner = await ownerService.updateOwner(idOf(req), req.validated!.body as never, actorOf(req));
      sendSuccess(res, serializeOwner(owner), 'Owner updated successfully.');
    },

    setStatus: async (req: Request, res: Response): Promise<void> => {
      const body = req.validated!.body as { status: 'ACTIVE' | 'INACTIVE' };
      const { owner } = await ownerService.setOwnerStatus(idOf(req), body.status, actorOf(req));
      sendSuccess(
        res,
        serializeOwner(owner),
        `Owner ${body.status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`,
      );
    },
  };
}
