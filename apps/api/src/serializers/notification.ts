import type { NotificationRow } from '../repositories/notification.repo.js';

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export function serializeNotification(n: NotificationRow): NotificationDto {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    entityType: n.entity_type,
    entityId: n.entity_id,
    isRead: n.is_read,
    readAt: n.read_at ? n.read_at.toISOString() : null,
    createdAt: n.created_at.toISOString(),
  };
}
