import { apiClient } from '../lib/apiClient.js';
import type { QueryParams, RowsPage } from '../types/api.js';
import type { MasterCategoryCode } from '@turvo/shared';
import type { MasterCategoryRow, MasterItemDto } from '../types/domain.js';

export interface MasterItemInput {
  category?: MasterCategoryCode;
  name?: string;
  description?: string | null;
  iconPath?: string | null;
  sortOrder?: number;
}

/** GET /master-data/categories. */
export async function listCategories(): Promise<MasterCategoryRow[]> {
  return apiClient.get<MasterCategoryRow[]>('/master-data/categories');
}

/** GET /master-data/items — paginated, filterable by category/status. */
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

/** POST /master-data/items — admin creates a master item. */
export async function createItem(input: MasterItemInput & { category: MasterCategoryCode; name: string }): Promise<MasterItemDto> {
  return apiClient.post<MasterItemDto>('/master-data/items', input);
}

/** PATCH /master-data/items/:id — admin updates a master item. */
export async function updateItem(itemId: string, input: MasterItemInput): Promise<MasterItemDto> {
  return apiClient.patch<MasterItemDto>(`/master-data/items/${itemId}`, input);
}

/** PATCH /master-data/items/:id/status — admin activates/deactivates. */
export async function setItemStatus(itemId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<MasterItemDto> {
  return apiClient.patch<MasterItemDto>(`/master-data/items/${itemId}/status`, { status });
}
