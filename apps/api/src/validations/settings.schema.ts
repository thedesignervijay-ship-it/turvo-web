import { z } from 'zod';
import { paginationSchema } from './common.js';

export const settingValueSchema = z
  .union([z.string(), z.number(), z.boolean(), z.array(z.unknown()), z.record(z.string(), z.unknown())])
  .nullable();

export const updateSettingsSchema = z
  .object({
    settings: z
      .array(
        z
          .object({
            key: z.string().trim().min(1).max(100),
            value: settingValueSchema,
            description: z.string().trim().max(500).optional().nullable(),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();

export const updateSettingParamsSchema = z.object({
  key: z.string().trim().min(1).max(100),
});

export const updateSettingSchema = z
  .object({
    value: settingValueSchema,
    description: z.string().trim().max(500).optional().nullable(),
  })
  .strict();

export const listAuditLogsQuerySchema = paginationSchema.extend({
  action: z.string().trim().min(1).optional(),
  entityType: z.string().trim().min(1).optional(),
  entityId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
