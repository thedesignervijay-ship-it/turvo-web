import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common.js';
import { bookingDateSchema } from './booking.schema.js';

export const bookingStatusFilterSchema = z.enum(['CONFIRMED', 'CANCELLED', 'COMPLETED']).optional();
export const bookingSourceFilterSchema = z.enum(['PHONE', 'IN_PERSON']).optional();

export const reportRangeQuerySchema = z
  .object({
    dateFrom: bookingDateSchema.optional(),
    dateTo: bookingDateSchema.optional(),
    turfId: uuidSchema.optional(),
    courtId: uuidSchema.optional(),
    sportId: uuidSchema.optional(),
    status: bookingStatusFilterSchema,
    bookingSource: bookingSourceFilterSchema,
    search: z.string().trim().min(1).optional(),
  })
  .strict()
  .refine((v) => v.dateFrom === undefined || v.dateTo === undefined || v.dateFrom <= v.dateTo, {
    path: ['dateTo'],
    message: 'dateTo must be on or after dateFrom.',
  });

export const bookingReportQuerySchema = paginationSchema.extend({
  dateFrom: bookingDateSchema.optional(),
  dateTo: bookingDateSchema.optional(),
  turfId: uuidSchema.optional(),
  courtId: uuidSchema.optional(),
  sportId: uuidSchema.optional(),
  status: bookingStatusFilterSchema,
  bookingSource: bookingSourceFilterSchema,
  ownerId: uuidSchema.optional(),
  format: z.enum(['csv']).optional(),
});

export const ownerReportQuerySchema = z
  .object({
    dateFrom: bookingDateSchema.optional(),
    dateTo: bookingDateSchema.optional(),
  })
  .strict();

export const turfReportQuerySchema = z
  .object({
    dateFrom: bookingDateSchema.optional(),
    dateTo: bookingDateSchema.optional(),
  })
  .strict();
