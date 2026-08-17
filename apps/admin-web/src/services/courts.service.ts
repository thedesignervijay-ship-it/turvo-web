import { apiClient } from '../lib/apiClient.js';
import type { CourtDto } from '../types/domain.js';

/** GET /turfs/:turfId/courts — courts belonging to a turf. */
export async function listCourts(turfId: string): Promise<CourtDto[]> {
  return apiClient.get<CourtDto[]>(`/turfs/${turfId}/courts`);
}

/** PATCH /courts/:id/status — activate/deactivate a court. */
export async function setCourtStatus(
  courtId: string,
  status: 'ACTIVE' | 'INACTIVE',
): Promise<CourtDto> {
  return apiClient.patch<CourtDto>(`/courts/${courtId}/status`, { status });
}
