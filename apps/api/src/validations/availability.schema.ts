import { z } from 'zod';
import { uuidSchema, dateSchema } from './common.js';

export const availabilityBlockTypeSchema = z.enum(['MAINTENANCE', 'OWNER_BLOCK', 'EMERGENCY']);

export const createAvailabilityBlockSchema = z
  .object({
    courtId: uuidSchema.optional(),
    startDateTime: z.iso.datetime({ offset: true }),
    endDateTime: z.iso.datetime({ offset: true }),
    blockType: availabilityBlockTypeSchema,
    reason: z.string().trim().max(500).optional().nullable(),
  })
  .strict()
  .refine((v) => v.startDateTime < v.endDateTime, {
    message: 'startDateTime must be earlier than endDateTime.',
    path: ['startDateTime'],
  });

export const availabilityQuerySchema = z
  .object({
    date: dateSchema,
  })
  .strict();

export const blockIdParamsSchema = z.object({
  id: uuidSchema,
});

export const turfIdParamsSchema = z.object({
  turfId: uuidSchema,
});
