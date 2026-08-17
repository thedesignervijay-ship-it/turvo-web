import type { CourtRow } from '../repositories/court.repo.js';

export interface CourtDto {
  id: string;
  turfId: string;
  sportId: string;
  name: string;
  description: string | null;
  capacity: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export function serializeCourt(court: CourtRow): CourtDto {
  return {
    id: court.id,
    turfId: court.turf_id,
    sportId: court.sport_id,
    name: court.name,
    description: court.description,
    capacity: court.capacity,
    status: court.status,
    createdAt: court.created_at.toISOString(),
    updatedAt: court.updated_at.toISOString(),
  };
}
