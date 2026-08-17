import type { AvailabilityBlockRow } from '../repositories/availability.repo.js';
import type { OperatingHourRow } from '../repositories/operatingHour.repo.js';

export interface OperatingHourDto {
  id: string;
  turfId: string;
  dayOfWeek: number;
  openingTime: string;
  closingTime: string;
  isClosed: boolean;
}

export function serializeOperatingHour(hour: OperatingHourRow): OperatingHourDto {
  return {
    id: hour.id,
    turfId: hour.turf_id,
    dayOfWeek: hour.day_of_week,
    openingTime: hour.opening_time,
    closingTime: hour.closing_time,
    isClosed: hour.is_closed,
  };
}

export interface AvailabilityBlockDto {
  id: string;
  turfId: string;
  courtId: string | null;
  startDateTime: string;
  endDateTime: string;
  blockType: AvailabilityBlockRow['block_type'];
  reason: string | null;
  createdAt: string;
}

export function serializeAvailabilityBlock(block: AvailabilityBlockRow): AvailabilityBlockDto {
  return {
    id: block.id,
    turfId: block.turf_id,
    courtId: block.court_id,
    startDateTime: block.start_datetime.toISOString(),
    endDateTime: block.end_datetime.toISOString(),
    blockType: block.block_type,
    reason: block.reason,
    createdAt: block.created_at.toISOString(),
  };
}
