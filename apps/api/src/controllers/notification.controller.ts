import type { Request, Response } from 'express';
import { sendSuccess } from '../lib/http.js';
import type { NotificationService, NotificationListQuery } from '../services/notification.service.js';
import { serializeNotification } from '../serializers/notification.js';

export function createNotificationController(notificationService: NotificationService) {
  return {
    list: async (req: Request, res: Response): Promise<void> => {
      const query = req.validated!.query as unknown as NotificationListQuery;
      const result = await notificationService.list(req.auth!.user.id, query);
      sendSuccess(res, { ...result, rows: result.rows.map(serializeNotification) });
    },

    unreadCount: async (req: Request, res: Response): Promise<void> => {
      const count = await notificationService.unreadCount(req.auth!.user.id);
      sendSuccess(res, { count });
    },

    markRead: async (req: Request, res: Response): Promise<void> => {
      const notification = await notificationService.markRead(req.auth!.user.id, String(req.params.id));
      sendSuccess(res, serializeNotification(notification), 'Notification marked as read.');
    },

    markAllRead: async (_req: Request, res: Response): Promise<void> => {
      const count = await notificationService.markAllRead(_req.auth!.user.id);
      sendSuccess(res, { marked: count }, 'All notifications marked as read.');
    },
  };
}
