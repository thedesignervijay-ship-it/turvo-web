import { z } from 'zod';
import { paginationSchema, emailSchema, phoneSchema, pincodeSchema, uuidSchema } from './common.js';

const sportIdsSchema = z.array(uuidSchema).min(1, 'At least one sport is required.').max(50);

const turfFields = {
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(2000),
  addressLine1: z.string().trim().min(1).max(255),
  addressLine2: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  pincode: pincodeSchema,
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  contactPhone: phoneSchema,
  contactEmail: emailSchema.optional().nullable(),
  slotDurationMinutes: z.union([z.literal(30), z.literal(60)]),
};

/** Owner creates a turf (starts in DRAFT). */
export const createTurfSchema = z
  .object({
    ...turfFields,
    slotDurationMinutes: z.union([z.literal(30), z.literal(60)]).default(60),
    sportIds: sportIdsSchema,
  })
  .strict();

/** Owner edits a DRAFT/REJECTED turf. */
export const updateTurfSchema = z
  .object({
    ...turfFields,
    sportIds: sportIdsSchema.optional(),
  })
  .partial()
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided.',
  });

/** Admin rejects a turf submission with a reason. */
export const rejectTurfSchema = z
  .object({
    reason: z.string().trim().min(1).max(500),
  })
  .strict();

/** Admin activates/deactivates an approved turf. */
export const turfStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .strict();

export const turfQuerySchema = paginationSchema.extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  approvalStatus: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED']).optional(),
  city: z.string().trim().max(100).optional(),
  ownerId: uuidSchema.optional(),
});
