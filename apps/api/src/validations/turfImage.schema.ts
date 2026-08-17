import { z } from 'zod';
import { uuidSchema } from './common.js';

export const turfIdParamsSchema = z.object({
  turfId: uuidSchema,
});

export const turfImageParamsSchema = z.object({
  turfId: uuidSchema,
  imageId: uuidSchema,
});

/** Reorder request: every image id in its new order, optional primary. */
export const reorderImagesSchema = z
  .object({
    imageIds: z.array(uuidSchema).min(1).max(10),
    primaryImageId: uuidSchema.optional(),
  })
  .strict();
