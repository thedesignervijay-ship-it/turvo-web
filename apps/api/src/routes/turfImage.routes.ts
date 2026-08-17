import { Router } from 'express';
import type { Container } from '../container.js';
import { createTurfImageController } from '../controllers/turfImage.controller.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { imageUploadErrorHandler, uploadImage } from '../middleware/upload.js';
import { turfIdParamsSchema, turfImageParamsSchema } from '../validations/turfImage.schema.js';
import { reorderImagesSchema } from '../validations/turfImage.schema.js';

export function createTurfImageRoutes(container: Container): Router {
  const router = Router();
  const controller = createTurfImageController(container.services.turfImage);

  router.get('/:turfId/images', authorize('turfs.read'), validate.params(turfIdParamsSchema), asyncHandler(controller.list));
  router.post(
    '/:turfId/images',
    authorize('turfs.update'),
    validate.params(turfIdParamsSchema),
    uploadImage,
    imageUploadErrorHandler,
    asyncHandler(controller.add),
  );
  router.put(
    '/:turfId/images/order',
    authorize('turfs.update'),
    validate.params(turfIdParamsSchema),
    validate.body(reorderImagesSchema),
    asyncHandler(controller.reorder),
  );
  router.delete(
    '/:turfId/images/:imageId',
    authorize('turfs.update'),
    validate.params(turfImageParamsSchema),
    asyncHandler(controller.remove),
  );

  return router;
}
