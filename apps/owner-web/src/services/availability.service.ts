import { apiClient } from '../lib/apiClient.js';
import type { BlockType } from '@turvo/shared';
import type {
  AvailabilityBlockDto,
  AvailabilityResponse,
  OperatingHourDto,
} from '../types/domain.js';

export interface OperatingHourInput {
  dayOfWeek: number;
  openingTime: string;
  closingTime: string;
  isClosed: boolean;
}

export interface AvailabilityBlockInput {
  courtId?: string;
  startDateTime: string;
  endDateTime: string;
  blockType: BlockType;
  reason?: string | null;
}

/** GET /turfs/:turfId/availability?date= — computed slots plus the day's blocks. */
export async function getAvailability(turfId: string, date: string): Promise<AvailabilityResponse> {
  return apiClient.get<AvailabilityResponse>(`/turfs/${turfId}/availability`, { date });
}

/** PUT /turfs/:turfId/operating-hours — replaces the full seven-day schedule. */
export async function putOperatingHours(turfId: string, days: OperatingHourInput[]): Promise<OperatingHourDto[]> {
  return apiClient.put<OperatingHourDto[]>(`/turfs/${turfId}/operating-hours`, { days });
}

/** POST /turfs/:turfId/availability-blocks — create an availability block. */
export async function createBlock(turfId: string, input: AvailabilityBlockInput): Promise<AvailabilityBlockDto> {
  return apiClient.post<AvailabilityBlockDto>(`/turfs/${turfId}/availability-blocks`, input);
}

/** DELETE /availability-blocks/:id — delete an availability block. */
export async function deleteBlock(blockId: string): Promise<null> {
  return apiClient.delete<null>(`/availability-blocks/${blockId}`);
}
