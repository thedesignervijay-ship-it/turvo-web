import type { DbClient } from '../db/client.js';
import { createMasterRepo, type MasterRepo, type MasterItemRow } from '../repositories/master.repo.js';
import type { TurfRepo } from '../repositories/turf.repo.js';
import type { AuditService } from './audit.service.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import type { MasterCategoryCode } from '@turvo/shared';

export interface Actor {
  id: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface MasterListQuery {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  sortOrder: 'asc' | 'desc';
  category?: MasterCategoryCode;
  status?: 'ACTIVE' | 'INACTIVE';
}

export function createMasterDataService(deps: {
  db: DbClient;
  masterRepo: MasterRepo;
  turfRepo: TurfRepo;
  audit: AuditService;
}) {
  return {
    async listCategories() {
      return deps.masterRepo.listCategories();
    },

    async listItems(query: MasterListQuery) {
      const { rows, total } = await deps.masterRepo.listItems({
        categoryCode: query.category,
        status: query.status,
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        orderBy: {
          column: query.sort ?? 'sort_order',
          order: query.sortOrder,
        },
      });
      return { rows, total, page: query.page, limit: query.limit };
    },

    /** Admin creates a master item (spec section 8). */
    async create(input: { category: MasterCategoryCode; name: string; description: string | null; iconPath: string | null; sortOrder: number }, actor: Actor): Promise<MasterItemRow> {
      const category = await deps.masterRepo.findCategoryByCode(input.category);
      if (!category) throw badRequest('Category is not active.');
      const item = await deps.masterRepo.create({
        categoryCode: input.category,
        name: input.name,
        description: input.description,
        iconPath: input.iconPath,
        sortOrder: input.sortOrder,
        createdBy: actor.id,
      });
      await deps.audit.log({
        actor,
        action: 'MASTER_ITEM_CREATE',
        entityType: 'master_items',
        entityId: item.id,
        oldValue: null,
        newValue: { category: input.category, name: input.name },
      });
      return item;
    },

    async update(
      itemId: string,
      input: { name?: string; description?: string | null; iconPath?: string | null; sortOrder?: number },
      actor: Actor,
    ): Promise<MasterItemRow> {
      const current = await deps.masterRepo.findItemById(itemId);
      if (!current) throw notFound('Master item not found.');
      const updated = await deps.masterRepo.update(itemId, { ...input, updatedBy: actor.id });
      if (!updated) throw notFound('Master item not found.');
      await deps.audit.log({
        actor,
        action: 'MASTER_ITEM_UPDATE',
        entityType: 'master_items',
        entityId: itemId,
        oldValue: { ...current },
        newValue: { ...updated },
      });
      return updated;
    },

    async setStatus(itemId: string, status: 'ACTIVE' | 'INACTIVE', actor: Actor): Promise<MasterItemRow> {
      const current = await deps.masterRepo.findItemById(itemId);
      if (!current) throw notFound('Master item not found.');
      if (current.status === status) throw conflict(`Master item is already ${status}.`);
      const updated = await deps.masterRepo.setStatus(itemId, status, actor.id);
      if (!updated) throw notFound('Master item not found.');
      await deps.audit.log({
        actor,
        action: status === 'ACTIVE' ? 'MASTER_ITEM_ACTIVATE' : 'MASTER_ITEM_DEACTIVATE',
        entityType: 'master_items',
        entityId: itemId,
        oldValue: { status: current.status },
        newValue: { status },
      });
      return updated;
    },

    /** Owner replaces the turf's facilities/rules/equipment selection. */
    async replaceTurfMasterItems(ownerId: string, turfId: string, itemIds: string[], actor: Actor): Promise<MasterItemRow[]> {
      const turf = await deps.turfRepo.findOwnedBy(turfId, ownerId);
      if (!turf) throw notFound('Turf not found.');
      const active = await deps.masterRepo.findActiveSelectableByIds(itemIds);
      if (active.length !== itemIds.length) {
        throw badRequest('Every item must be an active facility, rule or equipment item.');
      }
      await deps.db.transaction(async (tx) => {
        const master = createMasterRepo(tx);
        await master.replaceTurfMasterItems(tx, turfId, itemIds);
      });
      await deps.audit.log({
        actor,
        action: 'TURF_MASTER_ITEMS_UPDATE',
        entityType: 'turfs',
        entityId: turfId,
        oldValue: null,
        newValue: { itemIds },
      });
      return deps.masterRepo.listTurfMasterItems(turfId);
    },

    async listTurfMasterItems(ownerId: string, turfId: string): Promise<MasterItemRow[]> {
      const turf = await deps.turfRepo.findOwnedBy(turfId, ownerId);
      if (!turf) throw notFound('Turf not found.');
      return deps.masterRepo.listTurfMasterItems(turfId);
    },
  };
}

export type MasterDataService = ReturnType<typeof createMasterDataService>;
