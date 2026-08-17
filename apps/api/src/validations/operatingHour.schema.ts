import { z } from 'zod';
import { timeSchema } from './common.js';

export const dayOfWeekSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

export const operatingHourEntrySchema = z
  .object({
    dayOfWeek: dayOfWeekSchema,
    openingTime: timeSchema,
    closingTime: timeSchema,
    isClosed: z.boolean().optional().default(false),
  })
  .strict()
  .refine((v) => v.isClosed || v.openingTime < v.closingTime, {
    message: 'Opening time must be earlier than closing time.',
    path: ['openingTime'],
  });

/** PUT replaces the entire weekly schedule; all seven days are required. */
export const putOperatingHoursSchema = z
  .object({
    days: z.array(operatingHourEntrySchema).min(7).max(7),
  })
  .strict()
  .refine((v) => new Set(v.days.map((d) => d.dayOfWeek)).size === 7, {
    message: 'Exactly one entry for each of the seven days is required.',
    path: ['days'],
  });
