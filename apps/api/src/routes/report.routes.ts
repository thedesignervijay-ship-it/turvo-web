import { Router } from 'express';
import type { Container } from '../container.js';
import { createReportController } from '../controllers/report.controller.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  bookingReportQuerySchema,
  ownerReportQuerySchema,
  turfReportQuerySchema,
  reportRangeQuerySchema,
} from '../validations/report.schema.js';

/** /reports mounted at /api/v1/reports. */
export function createReportRoutes(container: Container): Router {
  const router = Router();
  const controller = createReportController(container.services.report);

  router.get('/booking-report', authorize('reports.read'), validate.query(bookingReportQuerySchema), asyncHandler(controller.bookingReport));
  router.get('/booking-report/export', authorize('reports.read'), validate.query(bookingReportQuerySchema), asyncHandler(controller.bookingReportCsv));
  router.get('/earnings-summary', authorize('earnings.read', 'reports.read'), asyncHandler(controller.earningsSummary));
  router.get('/daily-summary', authorize('reports.read'), validate.query(reportRangeQuerySchema), asyncHandler(controller.dailySummary));
  router.get('/cancellations', authorize('reports.read'), validate.query(reportRangeQuerySchema), asyncHandler(controller.cancellations));
  router.get('/owner-report', authorize('reports.read'), validate.query(ownerReportQuerySchema), asyncHandler(controller.ownerReport));
  router.get('/turf-report', authorize('reports.read'), validate.query(turfReportQuerySchema), asyncHandler(controller.turfReport));

  return router;
}
