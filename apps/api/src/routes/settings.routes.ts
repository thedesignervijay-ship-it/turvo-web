import { Router } from 'express';
import type { Container } from '../container.js';
import { createSettingsController } from '../controllers/settings.controller.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  updateSettingsSchema,
  updateSettingSchema,
  updateSettingParamsSchema,
  listAuditLogsQuerySchema,
} from '../validations/settings.schema.js';

/** /settings and /audit-logs mounted at /api/v1. */
export function createSettingsRoutes(container: Container): Router {
  const router = Router();
  const controller = createSettingsController(container.services.settings);

  router.get('/settings', authorize('settings.manage'), asyncHandler(controller.list));
  router.patch('/settings', authorize('settings.manage'), validate.body(updateSettingsSchema), asyncHandler(controller.upsertAll));
  router.patch('/settings/:key', authorize('settings.manage'), validate.params(updateSettingParamsSchema), validate.body(updateSettingSchema), asyncHandler(controller.upsertOne));
  router.get('/audit-logs', authorize('audit-logs.read'), validate.query(listAuditLogsQuerySchema), asyncHandler(controller.auditList));

  return router;
}
