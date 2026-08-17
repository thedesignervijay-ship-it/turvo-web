import { apiClient } from '../lib/apiClient.js';
import type { DayType } from '@turvo/shared';
import type { PricingRuleDto } from '../types/domain.js';

export interface PricingRuleInput {
  courtId?: string;
  startTime: string;
  endTime: string;
  dayType: DayType;
  price: number;
  currency?: 'INR';
  effectiveFrom: string;
  effectiveTo?: string | null;
}

/** GET /turfs/:turfId/pricing — pricing rules for the owner's turf. */
export async function listPricingRules(turfId: string): Promise<PricingRuleDto[]> {
  return apiClient.get<PricingRuleDto[]>(`/turfs/${turfId}/pricing`);
}

/** POST /turfs/:turfId/pricing — create a pricing rule. */
export async function createPricingRule(turfId: string, input: PricingRuleInput): Promise<PricingRuleDto> {
  return apiClient.post<PricingRuleDto>(`/turfs/${turfId}/pricing`, input);
}

/** PATCH /pricing/:id — update a pricing rule. */
export async function updatePricingRule(
  ruleId: string,
  input: Partial<PricingRuleInput>,
): Promise<PricingRuleDto> {
  return apiClient.patch<PricingRuleDto>(`/pricing/${ruleId}`, input);
}

/** PATCH /pricing/:id/status — activate/deactivate a pricing rule. */
export async function setPricingRuleStatus(ruleId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<PricingRuleDto> {
  return apiClient.patch<PricingRuleDto>(`/pricing/${ruleId}/status`, { status });
}
