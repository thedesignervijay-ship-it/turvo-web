import { Router } from 'express';
import type { Container } from '../container.js';
import { createTurfController } from '../controllers/turf.controller.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { idSchema } from '../validations/common.js';
import {
  createTurfSchema,
  updateTurfSchema,
  rejectTurfSchema,
  turfStatusSchema,
  turfQuerySchema,
} from '../validations/turf.schema.js';

/**
 * Turf routes (spec section 29). Same resources serve owner and admin;
 * the authorize + ownership checks in the service enforce scoping.
 */
export function createTurfRoutes(container: Container): Router {
  const router = Router();
  const controller = createTurfController(container.services.turf);

  router.post('/', authorize('turfs.create'), validate.body(createTurfSchema), asyncHandler(controller.create));
  router.get('/', authorize('turfs.read'), validate.query(turfQuerySchema), asyncHandler(controller.list));
  router.get('/:id', authorize('turfs.read'), validate.params(idSchema), asyncHandler(controller.get));
  router.patch('/:id', authorize('turfs.update'), validate.params(idSchema), validate.body(updateTurfSchema), asyncHandler(controller.update));

  router.post('/:id/submit', authorize('turfs.submit'), validate.params(idSchema), asyncHandler(controller.submit));
  router.post('/:id/approve', authorize('turfs.approve'), validate.params(idSchema), asyncHandler(controller.approve));
  router.post('/:id/reject', authorize('turfs.reject'), validate.params(idSchema), validate.body(rejectTurfSchema), asyncHandler(controller.reject));
  router.patch('/:id/status', authorize('turfs.activate', 'turfs.deactivate'), validate.params(idSchema), validate.body(turfStatusSchema), asyncHandler(controller.setStatus));

  return router;
}
