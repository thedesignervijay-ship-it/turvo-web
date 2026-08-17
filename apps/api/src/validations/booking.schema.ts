import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common.js';

export const bookingDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must use YYYY-MM-DD.');

export const bookingTimeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must use HH:MM:SS.');

export const createBookingSchema = z
  .object({
    courtId: uuidSchema,
    bookingDate: bookingDateSchema,
    startTime: bookingTimeSchema,
    endTime: bookingTimeSchema,
    customerName: z.string().trim().min(1).max(120),
    customerPhone: z
      .string()
      .trim()
      .min(7)
      .max(15)
      .regex(/^[0-9+\-()\s]+$/, 'Invalid phone number.'),
    bookingSource: z.enum(['PHONE', 'IN_PERSON']),
    discountAmount: z.coerce.number().min(0).optional().default(0),
  })
  .strict()
  .refine((v) => timeToMinutes(v.startTime) < timeToMinutes(v.endTime), {
    path: ['endTime'],
    message: 'End time must be after start time.',
  });

function timeToMinutes(time: string): number {
  const [hh = 0, mm = 0, ss = 0] = time.split(':').map(Number);
  return hh * 60 + mm + (ss ? ss / 60 : 0);
}

export const bookingIdParamsSchema = z.object({
  id: uuidSchema,
});

export const cancelBookingSchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

export const listBookingsQuerySchema = paginationSchema.extend({
  status: z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
  courtId: uuidSchema.optional(),
  turfId: uuidSchema.optional(),
  dateFrom: bookingDateSchema.optional(),
  dateTo: bookingDateSchema.optional(),
  search: z.string().trim().min(1).optional(),
});
