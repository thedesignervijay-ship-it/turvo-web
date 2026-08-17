import { z } from 'zod';
import { emailSchema, phoneSchema, pincodeSchema } from './common.js';

export const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.').max(120),
    email: emailSchema,
    password: z.string().min(8, 'Password must be at least 8 characters.').max(128),
    phone: phoneSchema,
    businessName: z.string().trim().min(1, 'Business name is required.').max(150),
    businessPhone: phoneSchema,
    businessEmail: emailSchema.optional().nullable(),
    addressLine1: z.string().trim().min(1, 'Address is required.').max(255),
    addressLine2: z.string().trim().max(255).optional().nullable(),
    city: z.string().trim().min(1, 'City is required.').max(100),
    state: z.string().trim().min(1, 'State is required.').max(100),
    pincode: pincodeSchema,
  })
  .strict();

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    phone: phoneSchema.optional(),
  })
  .strict()
  .refine((v) => v.name !== undefined || v.phone !== undefined, {
    message: 'At least one field must be provided.',
  });

export const updateBusinessProfileSchema = z
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
  .refine((v) => Object.values(v).some((x) => x !== undefined), {
    message: 'At least one field must be provided.',
  });
