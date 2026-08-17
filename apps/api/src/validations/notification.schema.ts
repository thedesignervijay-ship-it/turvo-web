import { z } from 'zod';
import { uuidSchema, paginationSchema } from './common.js';

export const notificationIdParamsSchema = z.object({
  id: uuidSchema,
});

export const listNotificationsQuerySchema = paginationSchema
  .omit({ search: true, sort: true, sortOrder: true })
  .extend({
    unreadOnly: z
      .enum(['true', 'false'])
      .optional()
      .transform((v) => (v === undefined ? undefined : v === 'true')),
  });
