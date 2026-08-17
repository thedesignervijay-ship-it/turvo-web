import { Router } from 'express';
import type { Container } from '../container.js';
import { createPricingController } from '../controllers/pricing.controller.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createPricingRuleSchema,
  updatePricingRuleSchema,
  pricingStatusSchema,
  turfIdParamsSchema,
  pricingIdParamsSchema,
} from '../validations/pricing.schema.js';

/** GET/POST /turfs/:turfId/pricing — mounted at /api/v1/turfs. */
export function createTurfPricingRoutes(container: Container): Router {
  const router = Router();
  const controller = createPricingController(container.services.pricing);

  router.get(
    '/:turfId/pricing',
    authorize('turfs.read'),
    validate.params(turfIdParamsSchema),
    asyncHandler(controller.list),
  );
  router.post(
    '/:turfId/pricing',
    authorize('turfs.update'),
    validate.params(turfIdParamsSchema),
    validate.body(createPricingRuleSchema),
    asyncHandler(controller.create),
  );

  return router;
}

/** PATCH /pricing/:id and /pricing/:id/status — mounted at /api/v1/pricing. */
export function createTopLevelPricingRoutes(container: Container): Router {
  const router = Router();
  const controller = createPricingController(container.services.pricing);

  router.patch(
    '/:id',
    authorize('turfs.update'),
    validate.params(pricingIdParamsSchema),
    validate.body(updatePricingRuleSchema),
    asyncHandler(controller.update),
  );
  router.patch(
    '/:id/status',
    authorize('turfs.update'),
    validate.params(pricingIdParamsSchema),
    validate.body(pricingStatusSchema),
    asyncHandler(controller.setStatus),
  );

  return router;
}
