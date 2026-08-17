import { Router } from 'express';
import type { Container } from '../container.js';
import { createCourtController } from '../controllers/court.controller.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createCourtSchema,
  updateCourtSchema,
  courtStatusSchema,
  courtIdParamsSchema,
  turfIdParamsSchema,
} from '../validations/court.schema.js';

/** POST/GET /turfs/:turfId/courts — mounted at /api/v1/turfs. */
export function createTurfCourtRoutes(container: Container): Router {
  const router = Router();
  const controller = createCourtController(container.services.court);

  router.get(
    '/:turfId/courts',
    authorize('turfs.read'),
    validate.params(turfIdParamsSchema),
    asyncHandler(controller.list),
  );
  router.post(
    '/:turfId/courts',
    authorize('turfs.update'),
    validate.params(turfIdParamsSchema),
    validate.body(createCourtSchema),
    asyncHandler(controller.create),
  );

  return router;
}

/** PATCH /courts/:id and /courts/:id/status — mounted at /api/v1/courts. */
export function createTopLevelCourtRoutes(container: Container): Router {
  const router = Router();
  const controller = createCourtController(container.services.court);

  router.patch(
    '/:id',
    authorize('turfs.update'),
    validate.params(courtIdParamsSchema),
    validate.body(updateCourtSchema),
    asyncHandler(controller.update),
  );
  router.patch(
    '/:id/status',
    authorize('turfs.update'),
    validate.params(courtIdParamsSchema),
    validate.body(courtStatusSchema),
    asyncHandler(controller.setStatus),
  );

  return router;
}
