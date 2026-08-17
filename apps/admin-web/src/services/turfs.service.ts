import { apiClient } from '../lib/apiClient.js';
import type { Paginated, QueryParams } from '../types/api.js';
import type { TurfApprovalStatus, TurfStatus } from '@turvo/shared';
import type { TurfDetailDto } from '../types/domain.js';

export interface TurfListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: TurfStatus;
  approvalStatus?: TurfApprovalStatus;
  city?: string;
  ownerId?: string;
  sort?: string;
  sortOrder?: 'asc' | 'desc';
}

/** GET /turfs — owner-scoped for owners, all turfs with filters for admins. */
export async function listTurfs(params: TurfListParams): Promise<{
  items: TurfDetailDto[];
  pagination: Paginated;
}> {
  return apiClient.get<{ items: TurfDetailDto[]; pagination: Paginated }>(
    '/turfs',
    params as unknown as QueryParams,
  );
}

/** GET /turfs/:id — turf detail (with owner, court count and sport ids). */
export async function getTurf(turfId: string): Promise<TurfDetailDto> {
  return apiClient.get<TurfDetailDto>(`/turfs/${turfId}`);
}

/** POST /turfs/:id/approve — admin approves a submitted turf. */
export async function approveTurf(turfId: string): Promise<TurfDetailDto> {
  return apiClient.post<TurfDetailDto>(`/turfs/${turfId}/approve`);
}

/** POST /turfs/:id/reject — admin rejects with a required reason. */
export async function rejectTurf(turfId: string, reason: string): Promise<TurfDetailDto> {
  return apiClient.post<TurfDetailDto>(`/turfs/${turfId}/reject`, { reason });
}

/** PATCH /turfs/:id/status — admin activates/deactivates an approved turf. */
export async function setTurfStatus(turfId: string, status: TurfStatus): Promise<TurfDetailDto> {
  return apiClient.patch<TurfDetailDto>(`/turfs/${turfId}/status`, { status });
}
