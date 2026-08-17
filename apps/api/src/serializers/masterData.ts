import type { MasterItemRow } from '../repositories/master.repo.js';

export interface MasterItemDto {
  id: string;
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  name: string;
  description: string | null;
  status: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function serializeMasterItem(item: MasterItemRow): MasterItemDto {
  return {
    id: item.id,
    categoryId: item.category_id,
    categoryCode: item.category_code,
    categoryName: item.category_name,
    name: item.name,
    description: item.description,
    status: item.status,
    sortOrder: item.sort_order,
    createdAt: item.created_at.toISOString(),
    updatedAt: item.updated_at.toISOString(),
  };
}
