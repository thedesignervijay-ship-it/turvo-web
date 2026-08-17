import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { unreadCount } from '../services/notifications.service.js';

/** Bell icon with the unread count, shown in the app header. */
export function NotificationsBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    unreadCount()
      .then((result) => {
        if (!cancelled) setCount(result.count);
      })
      .catch(() => {
        // Non-blocking — the bell simply shows no badge if the count fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="notif-bell">
      <Link to="/notifications" className="notif-bell__trigger" aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ''}`}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM13.73 21a2 2 0 0 1-3.46 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      {count > 0 && <span className="notif-bell__badge">{count > 99 ? '99+' : count}</span>}
    </div>
  );
}
