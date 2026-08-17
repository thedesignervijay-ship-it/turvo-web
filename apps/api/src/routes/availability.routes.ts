import { Router } from 'express';
import type { Container } from '../container.js';
import { createAvailabilityController } from '../controllers/availability.controller.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { turfIdParamsSchema } from '../validations/availability.schema.js';
import { blockIdParamsSchema } from '../validations/availability.schema.js';
import { availabilityQuerySchema } from '../validations/availability.schema.js';
import { createAvailabilityBlockSchema } from '../validations/availability.schema.js';
import { putOperatingHoursSchema } from '../validations/operatingHour.schema.js';

/** Turf-scoped availability routes — mounted at /api/v1/turfs. */
export function createTurfAvailabilityRoutes(container: Container): Router {
  const router = Router();
  const controller = createAvailabilityController(container.services.availability);

  router.get(
    '/:turfId/availability',
    authorize('turfs.read'),
    validate.params(turfIdParamsSchema),
    validate.query(availabilityQuerySchema),
    asyncHandler(controller.getAvailability),
  );
  router.put(
    '/:turfId/operating-hours',
    authorize('turfs.update'),
    validate.params(turfIdParamsSchema),
    validate.body(putOperatingHoursSchema),
    asyncHandler(controller.putOperatingHours),
  );
  router.post(
    '/:turfId/availability-blocks',
    authorize('turfs.update'),
    validate.params(turfIdParamsSchema),
    validate.body(createAvailabilityBlockSchema),
    asyncHandler(controller.createBlock),
  );

  return router;
}

/** Top-level availability-block routes — mounted at /api/v1/availability-blocks. */
export function createTopLevelAvailabilityRoutes(container: Container): Router {
  const router = Router();
  const controller = createAvailabilityController(container.services.availability);

  router.delete(
    '/:id',
    authorize('turfs.update'),
    validate.params(blockIdParamsSchema),
    asyncHandler(controller.deleteBlock),
  );

  return router;
}
