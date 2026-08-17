import { z } from 'zod';
import {
  paginationSchema,
  emailSchema,
  phoneSchema,
  pincodeSchema,
} from './common.js';

/** Owner business profile update (shared by /profile and admin /owners/:id). */
export const businessProfileSchema = z
  .object({
    businessName: z.string().trim().min(1).max(150).optional(),
    businessPhone: phoneSchema.optional(),
    businessEmail: emailSchema.optional().nullable(),
    addressLine1: z.string().trim().min(1).max(255).optional(),
    addressLine2: z.string().trim().max(255).optional().nullable(),
    city: z.string().trim().min(1).max(100).optional(),
    state: z.string().trim().min(1).max(100).optional(),
    pincode: pincodeSchema.optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided.',
  });

/** Owner updates their personal and business profile via /profile. */
export const profileUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: phoneSchema.optional(),
    ...businessProfileSchema.shape,
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided.',
  });

export const ownerStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .strict();

export const listOwnersQuerySchema = paginationSchema.extend({
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  city: z.string().trim().max(100).optional(),
});
