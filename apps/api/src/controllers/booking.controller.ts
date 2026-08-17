import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../lib/http.js';
import { forbidden } from '../lib/errors.js';
import type { BookingService, CreateBookingInput, BookingListQuery } from '../services/booking.service.js';
import { serializeBooking } from '../serializers/booking.js';

function actorOf(req: Request): { id: string; ip?: string | null; userAgent?: string | null } {
  return { id: req.auth!.user.id, ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
}

export function createBookingController(bookingService: BookingService) {
  return {
    create: async (req: Request, res: Response): Promise<void> => {
      const ownerId = req.auth!.owner?.id;
      if (!ownerId) throw forbidden('Only a turf owner can record a booking.');
      const body = req.validated!.body as CreateBookingInput;
      const booking = await bookingService.create(ownerId, body, actorOf(req));
      sendCreated(res, serializeBooking(booking), 'Booking created.');
    },

    list: async (req: Request, res: Response): Promise<void> => {
      const user = req.auth!.user;
      const ownerId = req.auth!.owner?.id ?? null;
      if (user.role === 'OWNER' && !ownerId) throw forbidden('Owner profile not found.');
      const query = req.validated!.query as unknown as BookingListQuery;
      const result = await bookingService.list({ id: user.id, role: user.role }, ownerId, query);
      sendSuccess(res, { ...result, rows: result.rows.map(serializeBooking) });
    },

    get: async (req: Request, res: Response): Promise<void> => {
      const user = req.auth!.user;
      const ownerId = req.auth!.owner?.id ?? null;
      if (user.role === 'OWNER' && !ownerId) throw forbidden('Owner profile not found.');
      const booking = await bookingService.get({ role: user.role }, ownerId, String(req.params.id));
      sendSuccess(res, serializeBooking(booking));
    },

    dashboard: async (req: Request, res: Response): Promise<void> => {
      const user = req.auth!.user;
      if (user.role === 'ADMIN') {
        const counts = await bookingService.adminDashboardCounts();
        sendSuccess(res, counts);
      } else {
        const ownerId = req.auth!.owner?.id;
        if (!ownerId) throw forbidden('Only a turf owner can view the dashboard.');
        const counts = await bookingService.dashboardCounts(ownerId);
        sendSuccess(res, counts);
      }
    },

    cancel: async (req: Request, res: Response): Promise<void> => {
      const ownerId = req.auth!.owner?.id;
      if (!ownerId) throw forbidden('Only a turf owner can cancel a booking.');
      const body = req.validated!.body as { reason: string };
      const booking = await bookingService.cancel(ownerId, String(req.params.id), body.reason, actorOf(req));
      sendSuccess(res, serializeBooking(booking), 'Booking cancelled.');
    },

    complete: async (req: Request, res: Response): Promise<void> => {
      const ownerId = req.auth!.owner?.id;
      if (!ownerId) throw forbidden('Only a turf owner can complete a booking.');
      const booking = await bookingService.complete(ownerId, String(req.params.id), actorOf(req));
      sendSuccess(res, serializeBooking(booking), 'Booking completed.');
    },
  };
}
