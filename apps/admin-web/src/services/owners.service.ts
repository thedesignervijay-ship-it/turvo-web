import { apiClient } from '../lib/apiClient.js';
import type { Paginated, QueryParams } from '../types/api.js';
import type { OwnerStatus } from '@turvo/shared';
import type { OwnerDto, OwnerWithUserDto } from '../types/domain.js';

export interface OwnerListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: OwnerStatus;
  city?: string;
  sort?: string;
  sortOrder?: 'asc' | 'desc';
}

/** GET /owners — admin owner list (paginated, filterable). */
export async function listOwners(params: OwnerListParams): Promise<{
  items: OwnerWithUserDto[];
  pagination: Paginated;
}> {
  return apiClient.get<{
    items: OwnerWithUserDto[];
    pagination: Paginated;
  }>('/owners', params as unknown as QueryParams);
}

/** GET /owners/:id — admin owner details. */
export async function getOwner(ownerId: string): Promise<OwnerWithUserDto> {
  return apiClient.get<OwnerWithUserDto>(`/owners/${ownerId}`);
}

/** PATCH /owners/:id/status — activate/deactivate an owner. */
export async function setOwnerStatus(
  ownerId: string,
  status: OwnerStatus,
): Promise<OwnerDto> {
  return apiClient.patch<OwnerDto>(`/owners/${ownerId}/status`, { status });
}
