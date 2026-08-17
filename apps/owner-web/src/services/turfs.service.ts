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
  sort?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TurfInput {
  name: string;
  description: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  contactPhone: string;
  contactEmail?: string | null;
  slotDurationMinutes: 30 | 60;
  sportIds: string[];
}

/** GET /turfs — owner-scoped list of the owner's own turfs. */
export async function listTurfs(params: TurfListParams): Promise<{
  items: TurfDetailDto[];
  pagination: Paginated;
}> {
  return apiClient.get<{ items: TurfDetailDto[]; pagination: Paginated }>(
    '/turfs',
    params as unknown as QueryParams,
  );
}

/** GET /turfs/:id — turf detail (owner-scoped). */
export async function getTurf(turfId: string): Promise<TurfDetailDto> {
  return apiClient.get<TurfDetailDto>(`/turfs/${turfId}`);
}

/** POST /turfs — owner creates a turf draft. */
export async function createTurf(input: TurfInput): Promise<TurfDetailDto> {
  return apiClient.post<TurfDetailDto>('/turfs', input);
}

/** PATCH /turfs/:id — owner edits a DRAFT/REJECTED turf. */
export async function updateTurf(turfId: string, input: Partial<TurfInput>): Promise<TurfDetailDto> {
  return apiClient.patch<TurfDetailDto>(`/turfs/${turfId}`, input);
}

/** POST /turfs/:id/submit — owner submits a turf for admin review. */
export async function submitTurf(turfId: string): Promise<TurfDetailDto> {
  return apiClient.post<TurfDetailDto>(`/turfs/${turfId}/submit`);
}
