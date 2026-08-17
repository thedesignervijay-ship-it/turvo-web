import { Router } from 'express';
import type { Container } from '../container.js';
import { createNotificationController } from '../controllers/notification.controller.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { notificationIdParamsSchema, listNotificationsQuerySchema } from '../validations/notification.schema.js';

/** /notifications mounted at /api/v1/notifications. */
export function createNotificationRoutes(container: Container): Router {
  const router = Router();
  const controller = createNotificationController(container.services.notification);

  router.get('/', authorize('notifications.read'), validate.query(listNotificationsQuerySchema), asyncHandler(controller.list));
  router.get('/unread-count', authorize('notifications.read'), asyncHandler(controller.unreadCount));
  router.patch('/read-all', authorize('notifications.update'), asyncHandler(controller.markAllRead));
  router.patch('/:id/read', authorize('notifications.update'), validate.params(notificationIdParamsSchema), asyncHandler(controller.markRead));

  return router;
}
