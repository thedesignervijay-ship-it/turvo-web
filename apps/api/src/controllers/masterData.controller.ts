import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../lib/http.js';
import { forbidden } from '../lib/errors.js';
import type { MasterDataService, MasterListQuery } from '../services/masterData.service.js';
import { serializeMasterItem } from '../serializers/masterData.js';
import type { MasterCategoryCode } from '@turvo/shared';

function actorOf(req: Request): { id: string; ip?: string | null; userAgent?: string | null } {
  return { id: req.auth!.user.id, ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
}

export function createMasterDataController(masterDataService: MasterDataService) {
  return {
    listCategories: async (req: Request, res: Response): Promise<void> => {
      const categories = await masterDataService.listCategories();
      sendSuccess(res, categories);
    },

    listItems: async (req: Request, res: Response): Promise<void> => {
      const query = req.validated!.query as unknown as MasterListQuery;
      const result = await masterDataService.listItems(query);
      sendSuccess(res, { ...result, rows: result.rows.map(serializeMasterItem) });
    },

    createItem: async (req: Request, res: Response): Promise<void> => {
      if (req.auth!.user.role !== 'ADMIN') throw forbidden();
      const body = req.validated!.body as {
        category: MasterCategoryCode;
        name: string;
        description: string | null;
        iconPath: string | null;
        sortOrder: number;
      };
      const item = await masterDataService.create(body, actorOf(req));
      sendCreated(res, serializeMasterItem(item), 'Master item created.');
    },

    updateItem: async (req: Request, res: Response): Promise<void> => {
      if (req.auth!.user.role !== 'ADMIN') throw forbidden();
      const body = req.validated!.body as object;
      const item = await masterDataService.update(String(req.params.id), body, actorOf(req));
      sendSuccess(res, serializeMasterItem(item), 'Master item updated.');
    },

    setItemStatus: async (req: Request, res: Response): Promise<void> => {
      if (req.auth!.user.role !== 'ADMIN') throw forbidden();
      const body = req.validated!.body as { status: 'ACTIVE' | 'INACTIVE' };
      const item = await masterDataService.setStatus(String(req.params.id), body.status, actorOf(req));
      sendSuccess(res, serializeMasterItem(item), `Master item ${body.status === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
    },

    replaceTurfMasterItems: async (req: Request, res: Response): Promise<void> => {
      const ownerId = req.auth!.owner?.id;
      if (!ownerId) throw forbidden('Only a turf owner can select facilities, rules and equipment.');
      const body = req.validated!.body as { itemIds: string[] };
      const items = await masterDataService.replaceTurfMasterItems(ownerId, String(req.params.turfId), body.itemIds, actorOf(req));
      sendSuccess(res, items.map(serializeMasterItem), 'Turf master items updated.');
    },

    listTurfMasterItems: async (req: Request, res: Response): Promise<void> => {
      const ownerId = req.auth!.owner?.id;
      if (!ownerId) throw forbidden('Only a turf owner can view this.');
      const items = await masterDataService.listTurfMasterItems(ownerId, String(req.params.turfId));
      sendSuccess(res, items.map(serializeMasterItem));
    },
  };
}
