import { apiClient } from '../lib/apiClient.js';
import type { QueryParams, RowsPage } from '../types/api.js';
import type { MasterCategoryCode } from '@turvo/shared';
import type { MasterItemDto } from '../types/domain.js';

/** GET /master-data/items — active master items for turf setup (owner). */
export async function listItems(params: {
  page?: number;
  limit?: number;
  category?: MasterCategoryCode;
  status?: 'ACTIVE' | 'INACTIVE';
  search?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<RowsPage<MasterItemDto>> {
  return apiClient.get<RowsPage<MasterItemDto>>(
    '/master-data/items',
    params as unknown as QueryParams,
  );
}

/** All active items across the four categories (for sports/facilities/rules/equipment setup). */
export async function listAllActiveItems(limit = 100): Promise<MasterItemDto[]> {
  const result = await listItems({ page: 1, limit, status: 'ACTIVE', sortOrder: 'asc' });
  return result.rows;
}
