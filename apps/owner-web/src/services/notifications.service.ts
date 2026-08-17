import { apiClient } from '../lib/apiClient.js';
import type { QueryParams, RowsPage } from '../types/api.js';
import type { NotificationDto } from '../types/domain.js';

/** GET /notifications — current user's notifications (paginated). */
export async function listNotifications(params: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}): Promise<RowsPage<NotificationDto>> {
  return apiClient.get<RowsPage<NotificationDto>>(
    '/notifications',
    params as unknown as QueryParams,
  );
}

/** GET /notifications/unread-count. */
export async function unreadCount(): Promise<{ count: number }> {
  return apiClient.get<{ count: number }>('/notifications/unread-count');
}

/** PATCH /notifications/:id/read. */
export async function markRead(notificationId: string): Promise<NotificationDto> {
  return apiClient.patch<NotificationDto>(`/notifications/${notificationId}/read`);
}

/** PATCH /notifications/read-all. */
export async function markAllRead(): Promise<{ marked: number }> {
  return apiClient.patch<{ marked: number }>('/notifications/read-all');
}
