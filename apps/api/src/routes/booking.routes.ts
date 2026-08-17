import { Router } from 'express';
import type { Container } from '../container.js';
import { createBookingController } from '../controllers/booking.controller.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import {
  createBookingSchema,
  bookingIdParamsSchema,
  cancelBookingSchema,
  listBookingsQuerySchema,
} from '../validations/booking.schema.js';

/** /bookings mounted at /api/v1/bookings. */
export function createBookingRoutes(container: Container): Router {
  const router = Router();
  const controller = createBookingController(container.services.booking);

  router.post('/', authorize('bookings.manage'), validate.body(createBookingSchema), asyncHandler(controller.create));
  router.get('/', authorize('bookings.read'), validate.query(listBookingsQuerySchema), asyncHandler(controller.list));
  router.get('/dashboard', authorize('dashboard.view'), asyncHandler(controller.dashboard));
  router.get('/:id', authorize('bookings.read'), validate.params(bookingIdParamsSchema), asyncHandler(controller.get));
  router.post('/:id/cancel', authorize('bookings.manage'), validate.params(bookingIdParamsSchema), validate.body(cancelBookingSchema), asyncHandler(controller.cancel));
  router.post('/:id/complete', authorize('bookings.manage'), validate.params(bookingIdParamsSchema), asyncHandler(controller.complete));

  return router;
}
