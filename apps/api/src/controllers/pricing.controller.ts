import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../lib/http.js';
import { forbidden } from '../lib/errors.js';
import type { PricingService } from '../services/pricing.service.js';
import { serializePricingRule } from '../serializers/pricing.js';

function ownerIdOf(req: Request): string {
  const ownerId = req.auth!.owner?.id;
  if (!ownerId) throw forbidden('Only a turf owner can manage pricing.');
  return ownerId;
}

function actorOf(req: Request): { id: string; ip?: string | null; userAgent?: string | null } {
  return { id: req.auth!.user.id, ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
}

export function createPricingController(pricingService: PricingService) {
  return {
    create: async (req: Request, res: Response): Promise<void> => {
      const body = req.validated!.body as Parameters<PricingService['create']>[2];
      const rule = await pricingService.create(ownerIdOf(req), String(req.params.turfId), body, actorOf(req));
      sendCreated(res, serializePricingRule(rule), 'Pricing rule created.');
    },

    list: async (req: Request, res: Response): Promise<void> => {
      const rules = await pricingService.list(ownerIdOf(req), String(req.params.turfId));
      sendSuccess(res, rules.map(serializePricingRule));
    },

    update: async (req: Request, res: Response): Promise<void> => {
      const body = req.validated!.body as Parameters<PricingService['update']>[2];
      const rule = await pricingService.update(ownerIdOf(req), String(req.params.id), body, actorOf(req));
      sendSuccess(res, serializePricingRule(rule), 'Pricing rule updated.');
    },

    setStatus: async (req: Request, res: Response): Promise<void> => {
      const body = req.validated!.body as { status: 'ACTIVE' | 'INACTIVE' };
      const rule = await pricingService.setStatus(ownerIdOf(req), String(req.params.id), body.status, actorOf(req));
      sendSuccess(res, serializePricingRule(rule), `Pricing rule ${body.status === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
    },
  };
}
