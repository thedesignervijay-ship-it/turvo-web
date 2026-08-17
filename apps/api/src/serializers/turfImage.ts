import type { TurfImageRow } from '../repositories/turfImage.repo.js';

export interface TurfImageDto {
  id: string;
  turfId: string;
  storagePath: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
  url?: string;
}

export function serializeTurfImage(image: TurfImageRow & { url?: string }): TurfImageDto {
  return {
    id: image.id,
    turfId: image.turf_id,
    storagePath: image.storage_path,
    isPrimary: image.is_primary,
    sortOrder: image.sort_order,
    createdAt: image.created_at.toISOString(),
    url: image.url,
  };
}
