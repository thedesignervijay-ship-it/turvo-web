import { z } from 'zod';
import { uuidSchema } from './common.js';

const capacitySchema = z.coerce.number().int().min(0);

export const createCourtSchema = z
  .object({
    sportId: uuidSchema,
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(1000).optional().nullable(),
    capacity: capacitySchema.optional().default(0),
  })
  .strict();

export const updateCourtSchema = z
  .object({
    sportId: uuidSchema.optional(),
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    capacity: capacitySchema.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided.',
  });

export const courtStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .strict();

export const courtIdParamsSchema = z.object({
  id: uuidSchema,
});

export const turfIdParamsSchema = z.object({
  turfId: uuidSchema,
});
