import type { Request, Response } from 'express';
import { sendCreated, sendPaginated, sendSuccess } from '../lib/http.js';
import { serializeTurfDetail } from '../serializers/turf.js';
import type { TurfService } from '../services/turf.service.js';
import type { z } from 'zod';
import type { turfQuerySchema } from '../validations/turf.schema.js';

type TurfListQuery = z.output<typeof turfQuerySchema>;

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

export function createTurfController(turfService: TurfService) {
  const ctxOf = (req: Request) => ({
    user: { id: req.auth!.user.id, role: req.auth!.user.role },
    ownerId: req.auth!.owner?.id,
  });

  return {
    create: async (req: Request, res: Response): Promise<void> => {
      const turf = await turfService.create(req.auth!.owner!.id, req.validated!.body as never, actorOf(req));
      sendCreated(res, serializeTurfDetail(turf!), 'Turf created successfully.');
    },

    list: async (req: Request, res: Response): Promise<void> => {
      const { items, pagination } = await turfService.list(ctxOf(req), req.validated!.query as unknown as TurfListQuery);
      sendPaginated(res, items.map(serializeTurfDetail), pagination);
    },

    get: async (req: Request, res: Response): Promise<void> => {
      const turf = await turfService.get(ctxOf(req), idOf(req));
      sendSuccess(res, serializeTurfDetail(turf));
    },

    update: async (req: Request, res: Response): Promise<void> => {
      const turf = await turfService.update(ctxOf(req), idOf(req), req.validated!.body as never, actorOf(req));
      sendSuccess(res, serializeTurfDetail(turf!), 'Turf updated successfully.');
    },

    submit: async (req: Request, res: Response): Promise<void> => {
      const turf = await turfService.submit(ctxOf(req), idOf(req), actorOf(req));
      sendSuccess(res, serializeTurfDetail(turf!), 'Turf submitted for review.');
    },

    approve: async (req: Request, res: Response): Promise<void> => {
      const turf = await turfService.approve(idOf(req), actorOf(req));
      sendSuccess(res, serializeTurfDetail(turf!), 'Turf approved.');
    },

    reject: async (req: Request, res: Response): Promise<void> => {
      const body = req.validated!.body as { reason: string };
      const turf = await turfService.reject(idOf(req), body.reason, actorOf(req));
      sendSuccess(res, serializeTurfDetail(turf!), 'Turf rejected.');
    },

    setStatus: async (req: Request, res: Response): Promise<void> => {
      const body = req.validated!.body as { status: 'ACTIVE' | 'INACTIVE' };
      const turf = await turfService.setStatus(idOf(req), body.status, actorOf(req));
      sendSuccess(
        res,
        serializeTurfDetail(turf!),
        `Turf ${body.status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully.`,
      );
    },
  };
}
