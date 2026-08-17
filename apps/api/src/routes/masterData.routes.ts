import { Router } from 'express';
import type { Container } from '../container.js';
import { createMasterDataController } from '../controllers/masterData.controller.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createMasterItemSchema,
  updateMasterItemSchema,
  masterItemStatusSchema,
  masterItemIdParamsSchema,
  listMasterItemsQuerySchema,
} from '../validations/masterData.schema.js';

/** /master-data mounted at /api/v1/master-data. */
export function createMasterDataRoutes(container: Container): Router {
  const router = Router();
  const controller = createMasterDataController(container.services.masterData);

  router.get('/categories', authorize('master-data.read'), asyncHandler(controller.listCategories));
  router.get('/items', authorize('master-data.read'), validate.query(listMasterItemsQuerySchema), asyncHandler(controller.listItems));
  router.post('/items', authorize('master-data.create'), validate.body(createMasterItemSchema), asyncHandler(controller.createItem));
  router.patch('/items/:id', authorize('master-data.update'), validate.params(masterItemIdParamsSchema), validate.body(updateMasterItemSchema), asyncHandler(controller.updateItem));
  router.patch('/items/:id/status', authorize('master-data.deactivate', 'master-data.activate'), validate.params(masterItemIdParamsSchema), validate.body(masterItemStatusSchema), asyncHandler(controller.setItemStatus));

  return router;
}
