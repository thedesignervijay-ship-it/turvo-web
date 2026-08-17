import { Router } from 'express';
import type { Container } from '../container.js';
import { createOwnerController } from '../controllers/owner.controller.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { idSchema } from '../validations/common.js';
import { listOwnersQuerySchema, ownerStatusSchema, businessProfileSchema, profileUpdateSchema } from '../validations/owner.schema.js';

export function createProfileRoutes(container: Container): Router {
  const router = Router();
  const controller = createOwnerController(container.services.owner);

  router.get('/', authorize('profile.read'), asyncHandler(controller.getProfile));
  router.patch('/', authorize('profile.update'), validate.body(profileUpdateSchema), asyncHandler(controller.updateProfile));

  return router;
}

export function createOwnerAdminRoutes(container: Container): Router {
  const router = Router();
  const controller = createOwnerController(container.services.owner);

  router.get('/', authorize('owners.read'), validate.query(listOwnersQuerySchema), asyncHandler(controller.list));
  router.get('/:id', authorize('owners.read'), validate.params(idSchema), asyncHandler(controller.get));
  router.patch('/:id', authorize('owners.update'), validate.params(idSchema), validate.body(businessProfileSchema), asyncHandler(controller.update));
  router.patch(
    '/:id/status',
    authorize('owners.activate', 'owners.deactivate'),
    validate.params(idSchema),
    validate.body(ownerStatusSchema),
    asyncHandler(controller.setStatus),
  );

  return router;
}
