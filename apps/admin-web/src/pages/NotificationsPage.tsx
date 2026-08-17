import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader.js';
import { DataTable, type Column } from '../components/ui/DataTable.js';
import { Pagination } from '../components/ui/Pagination.js';
import { Spinner, ErrorState } from '../components/ui/Feedback.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { useToast } from '../components/ui/Toast.js';
import { listNotifications, markRead, markAllRead } from '../services/notifications.service.js';
import { formatDateTime } from '../lib/format.js';
import type { NotificationDto } from '../types/domain.js';

const PAGE_SIZE = 20;

export function NotificationsPage() {
  const toast = useToast();
  const [rows, setRows] = useState<NotificationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listNotifications({ page, limit: PAGE_SIZE });
      setRows(result.rows);
      setTotal(result.total);
      setTotalPages(Math.ceil(result.total / PAGE_SIZE) || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  const doMarkRead = async (n: NotificationDto) => {
    try {
      await markRead(n.id);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update notification.');
    }
  };

  const doMarkAllRead = async () => {
    try {
      await markAllRead();
      toast.success('All notifications marked as read.');
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to update notifications.');
    }
  };

  const columns: Column<NotificationDto>[] = [
    {
      key: 'title',
      header: 'Title',
      render: (n) => (
        <div>
          <strong>{n.title}</strong>
          {!n.isRead && <span className="badge badge--info">New</span>}
        </div>
      ),
    },
    { key: 'message', header: 'Message', render: (n) => n.message },
    { key: 'type', header: 'Type', render: (n) => <Badge tone="neutral">{n.type}</Badge> },
    { key: 'created', header: 'Received', render: (n) => formatDateTime(n.createdAt) },
    {
      key: 'actions',
      header: '',
      render: (n) =>
        n.isRead ? null : (
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => doMarkRead(n)}>
            Mark read
          </button>
        ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Alerts about turf submissions and owner activity."
        actions={
          <Button variant="secondary" onClick={doMarkAllRead}>Mark all as read</Button>
        }
      />

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && !rows.length ? (
        <Spinner />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(n) => n.id}
            emptyTitle="No notifications"
            emptyMessage="You are all caught up."
          />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
