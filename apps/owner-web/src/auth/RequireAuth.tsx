import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext.js';

function FullScreenLoader() {
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p>Loading…</p>
    </div>
  );
}

/**
 * Blocks unauthenticated access and redirects to /login while preserving the
 * originally requested path so the user returns there after signing in.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullScreenLoader />;
  if (status === 'unauthenticated') {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}

/** Guards a route with an exact permission token. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
