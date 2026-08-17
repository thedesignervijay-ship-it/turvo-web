import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner } from '../components/ui/Feedback.js';
import { getOwnerDashboard, type OwnerDashboard } from '../services/dashboard.service.js';
import { formatCurrency, formatNumber } from '../lib/format.js';
import { useAuth } from '../auth/AuthContext.js';

interface MetricCardProps {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'danger' | 'info';
  to?: string;
}

function MetricCard({ label, value, tone = 'default', to }: MetricCardProps) {
  const content = (
    <div className={`metric-card${tone !== 'default' ? ` metric-card--${tone}` : ''}`}>
      <p className="metric-card__label">{label}</p>
      <p className="metric-card__value">{value}</p>
    </div>
  );
  return to ? <Link to={to} className="metric-card__link">{content}</Link> : content;
}

/**
 * Owner dashboard (spec section 21): turf, court and booking-value metrics
 * composed from the owner-scoped /turfs, /bookings/dashboard and
 * /reports/earnings-summary endpoints.
 */
export function DashboardPage() {
  const { me } = useAuth();
  const [data, setData] = useState<OwnerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getOwnerDashboard()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load the dashboard.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const businessName = me?.owner?.businessName ?? me?.user.name ?? 'Owner';

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${businessName}.`} />

      {error && <p className="alert alert--danger" role="alert">{error}</p>}

      {loading && !data ? (
        <Spinner />
      ) : data ? (
        <>
          <section aria-label="Turfs and courts">
            <h2 className="metric-group-title">Turfs</h2>
            <div className="metric-grid">
              <MetricCard label="Total turfs" value={formatNumber(data.totalTurfs)} to="/turfs" />
              <MetricCard label="Active turfs" value={formatNumber(data.activeTurfs)} tone="success" to="/turfs?status=ACTIVE" />
              <MetricCard label="Total courts" value={formatNumber(data.totalCourts)} tone="info" to="/courts" />
            </div>
          </section>

          <section aria-label="Bookings">
            <h2 className="metric-group-title">Bookings</h2>
            <div className="metric-grid">
              <MetricCard label="Today's bookings" value={formatNumber(data.todayBookings)} to="/bookings" />
              <MetricCard label="Upcoming (confirmed)" value={formatNumber(data.upcomingBookings)} tone="success" to="/bookings?status=CONFIRMED" />
              <MetricCard label="Cancelled bookings" value={formatNumber(data.cancelledBookings)} tone="danger" to="/bookings?status=CANCELLED" />
            </div>
          </section>

          <section aria-label="Booking value">
            <h2 className="metric-group-title">Booking value</h2>
            <div className="metric-grid">
              <MetricCard label="Today's value" value={formatCurrency(data.todayValue)} tone="info" to="/reports" />
              <MetricCard label="Monthly value" value={formatCurrency(data.monthValue)} tone="success" to="/reports" />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
