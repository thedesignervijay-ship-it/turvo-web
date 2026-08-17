import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../lib/http.js';
import { forbidden } from '../lib/errors.js';
import type { CourtService } from '../services/court.service.js';
import { serializeCourt } from '../serializers/court.js';

function ownerIdOf(req: Request): string {
  const ownerId = req.auth!.owner?.id;
  if (!ownerId) throw forbidden('Only a turf owner can manage courts.');
  return ownerId;
}

function actorOf(req: Request): { id: string; ip?: string | null; userAgent?: string | null } {
  return { id: req.auth!.user.id, ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
}

export function createCourtController(courtService: CourtService) {
  return {
    create: async (req: Request, res: Response): Promise<void> => {
      const body = req.validated!.body as {
        sportId: string;
        name: string;
        description: string | null;
        capacity: number;
      };
      const court = await courtService.create(ownerIdOf(req), String(req.params.turfId), body, actorOf(req));
      sendCreated(res, serializeCourt(court), 'Court created successfully.');
    },

    list: async (req: Request, res: Response): Promise<void> => {
      const courts = await courtService.list(ownerIdOf(req), String(req.params.turfId));
      sendSuccess(res, courts.map(serializeCourt));
    },

    update: async (req: Request, res: Response): Promise<void> => {
      const body = req.validated!.body as object;
      const court = await courtService.update(ownerIdOf(req), String(req.params.id), body, actorOf(req));
      sendSuccess(res, serializeCourt(court), 'Court updated.');
    },

    setStatus: async (req: Request, res: Response): Promise<void> => {
      const body = req.validated!.body as { status: 'ACTIVE' | 'INACTIVE' };
      const court = await courtService.setStatus(ownerIdOf(req), String(req.params.id), body.status, actorOf(req));
      sendSuccess(res, serializeCourt(court!), `Court ${body.status === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
    },
  };
}
