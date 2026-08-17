import type { NotificationRepo, NotificationRow } from '../repositories/notification.repo.js';
import { notFound } from '../lib/errors.js';

export interface NotificationListQuery {
  page: number;
  limit: number;
  unreadOnly?: boolean;
}

export function createNotificationService(notificationRepo: NotificationRepo) {
  return {
    async list(userId: string, query: NotificationListQuery) {
      const { rows, total } = await notificationRepo.listByUser(userId, {
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        unreadOnly: query.unreadOnly,
      });
      return { rows, total, page: query.page, limit: query.limit };
    },

    async unreadCount(userId: string): Promise<number> {
      return notificationRepo.unreadCount(userId);
    },

    async markRead(userId: string, notificationId: string): Promise<NotificationRow> {
      const marked = await notificationRepo.markRead(notificationId, userId);
      if (!marked) throw notFound('Notification not found.');
      const found = await notificationRepo.findById(notificationId, userId);
      if (!found) throw notFound('Notification not found.');
      return found;
    },

    async markAllRead(userId: string): Promise<number> {
      return notificationRepo.markAllRead(userId);
    },
  };
}

export type NotificationService = ReturnType<typeof createNotificationService>;
