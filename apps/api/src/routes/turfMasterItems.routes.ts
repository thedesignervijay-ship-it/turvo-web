import { Router } from 'express';
import type { Container } from '../container.js';
import { createMasterDataController } from '../controllers/masterData.controller.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { turfIdParamsSchema, turfMasterItemsSchema } from '../validations/masterData.schema.js';

/** PUT/GET /turfs/:turfId/master-items — mounted at /api/v1/turfs. */
export function createTurfMasterItemsRoutes(container: Container): Router {
  const router = Router();
  const controller = createMasterDataController(container.services.masterData);

  router.get('/:turfId/master-items', authorize('turfs.read'), validate.params(turfIdParamsSchema), asyncHandler(controller.listTurfMasterItems));
  router.put('/:turfId/master-items', authorize('turfs.update'), validate.params(turfIdParamsSchema), validate.body(turfMasterItemsSchema), asyncHandler(controller.replaceTurfMasterItems));

  return router;
}
