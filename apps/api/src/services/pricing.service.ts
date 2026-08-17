import type { PricingRepo, PricingRuleRow } from '../repositories/pricing.repo.js';
import type { TurfRepo } from '../repositories/turf.repo.js';
import type { CourtRepo } from '../repositories/court.repo.js';
import type { AuditService } from './audit.service.js';
import { conflict, notFound } from '../lib/errors.js';

export interface Actor {
  id: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface CreatePricingRuleInput {
  courtId?: string;
  startTime: string;
  endTime: string;
  dayType: 'WEEKDAY' | 'WEEKEND';
  price: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}

export type UpdatePricingRuleInput = Partial<CreatePricingRuleInput> & { courtId?: string | null };

export function createPricingService(deps: {
  pricingRepo: PricingRepo;
  turfRepo: TurfRepo;
  courtRepo: CourtRepo;
  audit: AuditService;
}) {
  const assertNoOverlap = async (
    turfId: string,
    input: { courtId: string | null; startTime: string; endTime: string; dayType: 'WEEKDAY' | 'WEEKEND'; effectiveFrom: string; effectiveTo: string | null },
    excludeId?: string,
  ) => {
    const overlaps = await deps.pricingRepo.hasOverlappingActive({
      turfId,
      courtId: input.courtId,
      dayType: input.dayType,
      startTime: input.startTime,
      endTime: input.endTime,
      effectiveFrom: input.effectiveFrom,
      effectiveTo: input.effectiveTo,
      excludeId,
    });
    if (overlaps) {
      throw conflict('Active pricing rules for the same court, day type and time period cannot overlap.');
    }
  };

  return {
    /** Owner creates a pricing rule; overlap is rejected (section 13). */
    async create(ownerId: string, turfId: string, input: CreatePricingRuleInput, actor: Actor): Promise<PricingRuleRow> {
      const turf = await deps.turfRepo.findOwnedBy(turfId, ownerId);
      if (!turf) throw notFound('Turf not found.');
      if (input.courtId) {
        const court = await deps.courtRepo.findOwnedById(input.courtId, ownerId);
        if (!court || court.turf_id !== turfId) throw notFound('Court not found on this turf.');
      }
      await assertNoOverlap(turfId, { courtId: input.courtId ?? null, ...input });
      const rule = await deps.pricingRepo.create({ turfId, courtId: input.courtId ?? null, ...input });
      await deps.audit.log({
        actor,
        action: 'PRICING_RULE_CREATE',
        entityType: 'pricing_rules',
        entityId: rule.id,
        oldValue: null,
        newValue: { ...input, turfId },
      });
      return rule;
    },

    async list(ownerId: string, turfId: string): Promise<PricingRuleRow[]> {
      const turf = await deps.turfRepo.findOwnedBy(turfId, ownerId);
      if (!turf) throw notFound('Turf not found.');
      return deps.pricingRepo.listByTurf(turfId);
    },

    async update(ownerId: string, ruleId: string, input: UpdatePricingRuleInput, actor: Actor): Promise<PricingRuleRow> {
      const rule = await deps.pricingRepo.findOwnedById(ruleId, ownerId);
      if (!rule) throw notFound('Pricing rule not found.');
      if (input.courtId) {
        const court = await deps.courtRepo.findOwnedById(input.courtId, ownerId);
        if (!court || court.turf_id !== rule.turf_id) throw notFound('Court not found on this turf.');
      }
      const merged = {
        courtId: input.courtId !== undefined ? input.courtId : rule.court_id,
        startTime: input.startTime ?? rule.start_time,
        endTime: input.endTime ?? rule.end_time,
        dayType: input.dayType ?? rule.day_type,
        effectiveFrom: input.effectiveFrom ?? rule.effective_from,
        effectiveTo: input.effectiveTo !== undefined ? input.effectiveTo : rule.effective_to,
      };
      await assertNoOverlap(rule.turf_id, merged, ruleId);
      const updated = await deps.pricingRepo.update(ruleId, input);
      if (!updated) throw notFound('Pricing rule not found.');
      await deps.audit.log({
        actor,
        action: 'PRICING_RULE_UPDATE',
        entityType: 'pricing_rules',
        entityId: ruleId,
        oldValue: { ...rule },
        newValue: { ...updated },
      });
      return updated;
    },

    async setStatus(ownerId: string, ruleId: string, status: 'ACTIVE' | 'INACTIVE', actor: Actor): Promise<PricingRuleRow> {
      const rule = await deps.pricingRepo.findOwnedById(ruleId, ownerId);
      if (!rule) throw notFound('Pricing rule not found.');
      if (rule.status === status) throw conflict(`Pricing rule is already ${status}.`);
      const updated = await deps.pricingRepo.setStatus(ruleId, status);
      if (!updated) throw notFound('Pricing rule not found.');
      await deps.audit.log({
        actor,
        action: 'PRICING_RULE_STATUS',
        entityType: 'pricing_rules',
        entityId: ruleId,
        oldValue: { status: rule.status },
        newValue: { status },
      });
      return updated;
    },
  };
}

export type PricingService = ReturnType<typeof createPricingService>;
