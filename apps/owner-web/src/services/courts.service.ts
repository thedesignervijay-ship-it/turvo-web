import { apiClient } from '../lib/apiClient.js';
import type { CourtStatus } from '@turvo/shared';
import type { CourtDto } from '../types/domain.js';

export interface CourtInput {
  sportId: string;
  name: string;
  description?: string | null;
  capacity?: number;
}

/** GET /turfs/:turfId/courts — courts belonging to the owner's turf. */
export async function listCourts(turfId: string): Promise<CourtDto[]> {
  return apiClient.get<CourtDto[]>(`/turfs/${turfId}/courts`);
}

/** POST /turfs/:turfId/courts — create a court. */
export async function createCourt(turfId: string, input: CourtInput): Promise<CourtDto> {
  return apiClient.post<CourtDto>(`/turfs/${turfId}/courts`, input);
}

/** PATCH /courts/:id — update a court. */
export async function updateCourt(courtId: string, input: Partial<CourtInput>): Promise<CourtDto> {
  return apiClient.patch<CourtDto>(`/courts/${courtId}`, input);
}

/** PATCH /courts/:id/status — activate/deactivate a court. */
export async function setCourtStatus(courtId: string, status: CourtStatus): Promise<CourtDto> {
  return apiClient.patch<CourtDto>(`/courts/${courtId}/status`, { status });
}
