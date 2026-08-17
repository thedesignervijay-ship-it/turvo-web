import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.js';
import { Button } from './ui/Button.js';
import { NotificationsBell } from './NotificationsBell.js';

interface NavItem {
  to: string;
  label: string;
  permission: string;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard', permission: 'dashboard.view' },
  { to: '/turfs', label: 'My Turfs', permission: 'turfs.read' },
  { to: '/bookings', label: 'Bookings', permission: 'bookings.read' },
  { to: '/reports', label: 'Reports', permission: 'reports.read' },
  { to: '/notifications', label: 'Notifications', permission: 'notifications.read' },
  { to: '/profile', label: 'Profile', permission: 'profile.read' },
];

/**
 * Owner app shell. Nav items are permission-gated so the sidebar only shows
 * modules the signed-in owner is allowed to use.
 */
export function AppLayout() {
  const { me, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const items = NAV_ITEMS.filter((item) => hasPermission(item.permission));

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar${mobileOpen ? ' sidebar--open' : ''}`}>
        <div className="sidebar__brand">
          <span className="sidebar__logo">T</span>
          <span className="sidebar__name">Turvo Owner</span>
        </div>
        <nav className="sidebar__nav" aria-label="Main">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `sidebar__link${isActive ? ' sidebar__link--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      {mobileOpen && (
        <button type="button" className="sidebar-backdrop" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
      )}
      <div className="app-main">
        <header className="topbar">
          <button type="button" className="topbar__menu" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            &#9776;
          </button>
          <div className="topbar__spacer" />
          <NotificationsBell />
          <div className="topbar__user">
            <span className="topbar__user-name">{me?.user.name ?? 'Owner'}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
