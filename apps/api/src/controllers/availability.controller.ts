import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../lib/http.js';
import { forbidden } from '../lib/errors.js';
import type { AvailabilityService } from '../services/availability.service.js';
import { serializeOperatingHour, serializeAvailabilityBlock } from '../serializers/availability.js';

function ownerIdOf(req: Request): string {
  const ownerId = req.auth!.owner?.id;
  if (!ownerId) throw forbidden('Only a turf owner can manage availability.');
  return ownerId;
}

function actorOf(req: Request): { id: string; ip?: string | null; userAgent?: string | null } {
  return { id: req.auth!.user.id, ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
}

export function createAvailabilityController(availabilityService: AvailabilityService) {
  return {
    getAvailability: async (req: Request, res: Response): Promise<void> => {
      const query = req.validated!.query as { date: string };
      const result = await availabilityService.availability(ownerIdOf(req), String(req.params.turfId), query.date);
      sendSuccess(res, result);
    },

    putOperatingHours: async (req: Request, res: Response): Promise<void> => {
      const body = req.validated!.body as {
        days: { dayOfWeek: number; openingTime: string; closingTime: string; isClosed: boolean }[];
      };
      const hours = await availabilityService.putOperatingHours(
        ownerIdOf(req),
        String(req.params.turfId),
        body.days,
        actorOf(req),
      );
      sendSuccess(res, hours.map(serializeOperatingHour), 'Operating hours updated.');
    },

    createBlock: async (req: Request, res: Response): Promise<void> => {
      const body = req.validated!.body as {
        courtId?: string;
        startDateTime: string;
        endDateTime: string;
        blockType: 'MAINTENANCE' | 'OWNER_BLOCK' | 'EMERGENCY';
        reason: string | null;
      };
      const block = await availabilityService.createBlock(ownerIdOf(req), String(req.params.turfId), body, actorOf(req));
      sendCreated(res, serializeAvailabilityBlock(block), 'Availability block created.');
    },

    deleteBlock: async (req: Request, res: Response): Promise<void> => {
      await availabilityService.deleteBlock(ownerIdOf(req), String(req.params.id), actorOf(req));
      sendSuccess(res, null, 'Availability block deleted.');
    },
  };
}
