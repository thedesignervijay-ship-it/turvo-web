import { z } from 'zod';
import { uuidSchema } from './common.js';
import { paginationSchema } from './common.js';
import { masterCategoryCodeSchema } from './common.js';

export const createMasterItemSchema = z
  .object({
    category: masterCategoryCodeSchema,
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().max(1000).optional().nullable(),
    iconPath: z.string().trim().max(500).optional().nullable(),
    sortOrder: z.coerce.number().int().min(0).optional().default(0),
  })
  .strict();

export const updateMasterItemSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(1000).optional().nullable(),
    iconPath: z.string().trim().max(500).optional().nullable(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided.',
  });

export const masterItemStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .strict();

export const masterItemIdParamsSchema = z.object({
  id: uuidSchema,
});

export const turfIdParamsSchema = z.object({
  turfId: uuidSchema,
});

export const listMasterItemsQuerySchema = paginationSchema.extend({
  category: masterCategoryCodeSchema.optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

export const turfMasterItemsSchema = z
  .object({
    itemIds: z.array(uuidSchema).max(50),
  })
  .strict();
