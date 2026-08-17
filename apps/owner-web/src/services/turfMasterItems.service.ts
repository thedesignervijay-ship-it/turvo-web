import { apiClient } from '../lib/apiClient.js';
import type { MasterItemDto } from '../types/domain.js';

/** GET /turfs/:turfId/master-items — the facilities/rules/equipment assigned to a turf. */
export async function listTurfMasterItems(turfId: string): Promise<MasterItemDto[]> {
  return apiClient.get<MasterItemDto[]>(`/turfs/${turfId}/master-items`);
}

/** PUT /turfs/:turfId/master-items — replace the full selection (empty = none). */
export async function replaceTurfMasterItems(turfId: string, itemIds: string[]): Promise<MasterItemDto[]> {
  return apiClient.put<MasterItemDto[]>(`/turfs/${turfId}/master-items`, { itemIds });
}
