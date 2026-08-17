import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, EmptyState } from '../components/ui/Feedback.js';
import { Button } from '../components/ui/Button.js';
import { Badge, type BadgeTone } from '../components/ui/Badge.js';
import { Pagination } from '../components/ui/Pagination.js';
import { useToast } from '../components/ui/Toast.js';
import { listNotifications, markRead, markAllRead } from '../services/notifications.service.js';
import type { NotificationDto } from '../types/domain.js';
import { formatDateTime } from '../lib/format.js';

const TYPE_TONES: Record<string, BadgeTone> = {
  BOOKING_CREATED: 'info',
  BOOKING_CANCELLED: 'danger',
  BOOKING_COMPLETED: 'success',
  TURF_STATUS_CHANGE: 'warning',
  TURF_SUBMITTED: 'warning',
  TURF_APPROVED: 'success',
  TURF_REJECTED: 'danger',
};

export function NotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listNotifications({ page, limit: 20 });
      setItems(result.rows);
      setTotal(result.total);
      setTotalPages(Math.max(1, Math.ceil(result.total / 20)));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkRead = async (notification: NotificationDto) => {
    if (notification.isRead) return;
    try {
      await markRead(notification.id);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update the notification.');
    }
  };

  const handleMarkAll = async () => {
    setWorking(true);
    try {
      await markAllRead();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to mark notifications as read.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Updates about your turfs and bookings."
        actions={
          <Button variant="secondary" loading={working} disabled={items.every((n) => n.isRead)} onClick={handleMarkAll}>
            Mark all read
          </Button>
        }
      />

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState title="No notifications" message="You are all caught up." />
      ) : (
        <>
          <div className="notification-list">
            {items.map((n) => (
              <button
                key={n.id}
                type="button"
                className={`notif-item${n.isRead ? '' : ' notif-item--unread'}`}
                onClick={() => handleMarkRead(n)}
              >
                <div className="notification-item__head">
                  <Badge tone={TYPE_TONES[n.type] ?? 'neutral'}>{n.type.replace(/_/g, ' ')}</Badge>
                  {!n.isRead && <span className="notification-item__dot" aria-label="Unread" />}
                </div>
                <p className="notif-item__title">{n.title}</p>
                <p className="notif-item__message">{n.message}</p>
                <p className="notif-item__time">{formatDateTime(n.createdAt)}</p>
              </button>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
