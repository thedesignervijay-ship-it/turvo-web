import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { unreadCount, listNotifications } from '../services/notifications.service.js';
import { formatDateTime } from '../lib/format.js';
import type { NotificationDto } from '../types/domain.js';

export function NotificationsBell() {
  const { hasPermission } = useAuth();
  const [count, setCount] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const refreshCount = () => {
    unreadCount()
      .then((r) => setCount(r.count))
      .catch(() => {});
  };

  useEffect(() => {
    refreshCount();
    const timer = window.setInterval(refreshCount, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    listRecent()
      .then(setItems)
      .catch(() => setError('Unable to load notifications.'))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (!hasPermission('notifications.read')) return null;

  return (
    <div className="notif-bell" ref={panelRef}>
      <button
        type="button"
        className="notif-bell__trigger"
        aria-label={`Notifications${count ? ` (${count} unread)` : ''}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
          />
        </svg>
        {count > 0 && <span className="notif-bell__badge">{count > 99 ? '99+' : count}</span>}
      </button>
      {open && (
        <div className="notif-panel">
          <div className="notif-panel__header">
            <strong>Notifications</strong>
            <Link to="/notifications" onClick={() => setOpen(false)}>
              View all
            </Link>
          </div>
          <div className="notif-panel__body">
            {loading ? (
              <p className="notif-panel__hint">Loading…</p>
            ) : error ? (
              <p className="notif-panel__hint">{error}</p>
            ) : items.length === 0 ? (
              <p className="notif-panel__hint">No notifications yet.</p>
            ) : (
              items.map((n) => (
                <div key={n.id} className={`notif-item${n.isRead ? '' : ' notif-item--unread'}`}>
                  <p className="notif-item__title">{n.title}</p>
                  <p className="notif-item__message">{n.message}</p>
                  <p className="notif-item__time">{formatDateTime(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

async function listRecent(): Promise<NotificationDto[]> {
  const result = await listNotifications({ page: 1, limit: 5 });
  return result.rows;
}
