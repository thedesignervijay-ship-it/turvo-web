import { z } from 'zod';
import { uuidSchema, dateSchema, timeSchema } from './common.js';

export const dayTypeSchema = z.enum(['WEEKDAY', 'WEEKEND']);

export const createPricingRuleSchema = z
  .object({
    courtId: uuidSchema.optional(),
    startTime: timeSchema,
    endTime: timeSchema,
    dayType: dayTypeSchema,
    price: z.coerce.number().positive('Price must be greater than zero.'),
    currency: z.literal('INR').optional().default('INR'),
    effectiveFrom: dateSchema,
    effectiveTo: dateSchema.optional().nullable(),
  })
  .strict()
  .refine((v) => v.startTime < v.endTime, {
    message: 'startTime must be earlier than endTime.',
    path: ['startTime'],
  })
  .refine((v) => v.effectiveTo === null || v.effectiveTo === undefined || v.effectiveFrom <= v.effectiveTo, {
    message: 'effectiveFrom must not be after effectiveTo.',
    path: ['effectiveFrom'],
  });

export const updatePricingRuleSchema = z
  .object({
    courtId: uuidSchema.optional(),
    startTime: timeSchema.optional(),
    endTime: timeSchema.optional(),
    dayType: dayTypeSchema.optional(),
    price: z.coerce.number().positive('Price must be greater than zero.').optional(),
    currency: z.literal('INR').optional(),
    effectiveFrom: dateSchema.optional(),
    effectiveTo: dateSchema.optional().nullable(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: 'At least one field must be provided.',
  });

export const pricingStatusSchema = z
  .object({
    status: z.enum(['ACTIVE', 'INACTIVE']),
  })
  .strict();

export const turfIdParamsSchema = z.object({
  turfId: uuidSchema,
});

export const pricingIdParamsSchema = z.object({
  id: uuidSchema,
});
