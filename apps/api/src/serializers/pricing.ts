import type { PricingRuleRow } from '../repositories/pricing.repo.js';

export interface PricingRuleDto {
  id: string;
  turfId: string;
  courtId: string | null;
  startTime: string;
  endTime: string;
  dayType: 'WEEKDAY' | 'WEEKEND';
  price: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export function serializePricingRule(rule: PricingRuleRow): PricingRuleDto {
  return {
    id: rule.id,
    turfId: rule.turf_id,
    courtId: rule.court_id,
    startTime: rule.start_time,
    endTime: rule.end_time,
    dayType: rule.day_type,
    price: rule.price,
    currency: rule.currency,
    effectiveFrom: rule.effective_from,
    effectiveTo: rule.effective_to,
    status: rule.status,
    createdAt: rule.created_at.toISOString(),
    updatedAt: rule.updated_at.toISOString(),
  };
}
