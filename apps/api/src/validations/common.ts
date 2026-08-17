import { z } from 'zod';
import { MASTER_CATEGORY_CODE, type MasterCategoryCode } from '@turvo/shared';

export const uuidSchema = z.string().uuid();

export const phoneSchema = z
  .string()
  .regex(/^\+?[0-9]{10,15}$/, 'Phone must be 10-15 digits (optional leading +).');

export const pincodeSchema = z
  .string()
  .regex(/^[0-9]{6}$/, 'Pincode must be exactly 6 digits.');

export const emailSchema = z.string().trim().toLowerCase().email().max(255);

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD.');

export const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, 'Time must be HH:MM or HH:MM:SS.');

export const idSchema = z.object({
  id: z.string().uuid('id must be a valid UUID.'),
});

/** Shared pagination query parameters. */
export const paginationSchema = z
  .object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(200).optional(),
    sort: z.string().trim().min(1).max(100).optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc'),
  })
  .strict();

/** Optional JSON-serializable value (used by platform settings). */
export const jsonValueSchema = z.unknown();

export const masterCategoryCodeSchema = z.nativeEnum(MASTER_CATEGORY_CODE);

export type MasterCategoryCodeValue = MasterCategoryCode;
