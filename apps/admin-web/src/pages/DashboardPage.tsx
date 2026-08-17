import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, EmptyState, ErrorState } from '../components/ui/Feedback.js';
import {
  getAdminDashboard,
  getDailySummary,
} from '../services/dashboard.service.js';
import type {
  AdminDashboardCountsDto,
  DailySummaryRow,
} from '../types/domain.js';
import {
  rangeThisMonth,
  rangeThisWeek,
  rangeToday,
  formatCurrency,
  formatNumber,
  type DateRange,
} from '../lib/format.js';

type RangeKey = 'today' | 'week' | 'month';

const RANGE_PRESETS: Record<RangeKey, () => DateRange> = {
  today: rangeToday,
  week: rangeThisWeek,
  month: rangeThisMonth,
};

/* ───────────────────────────── Icons (inline SVG) ───────────────────────── */

function IconOwners() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconTurfs() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 12h18" />
      <path d="M12 3v18" />
    </svg>
  );
}

function IconBookings() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconRevenue() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconX() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

/* ────────────────────────── Metric Card ────────────────────────── */

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconColor: 'blue' | 'green' | 'yellow' | 'red' | 'info';
  to?: string;
}

function MetricCard({ label, value, icon, iconColor, to }: MetricCardProps) {
  const card = (
    <div className="metric-card metric-card--clickable">
      <div className="metric-card__header">
        <div className={`metric-card__icon metric-card__icon--${iconColor}`}>
          {icon}
        </div>
      </div>
      <p className="metric-card__label">{label}</p>
      <p className="metric-card__value">{value}</p>
    </div>
  );

  return to ? (
    <Link to={to} className="metric-card__link">
      {card}
    </Link>
  ) : (
    card
  );
}

/* ────────────────────── Bar Chart (pure CSS) ────────────────────── */

function BarChart({ rows }: { rows: DailySummaryRow[] }) {
  const maxCount = useMemo(
    () => Math.max(...rows.map((r) => r.count), 1),
    [rows],
  );

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state__title">No data</p>
        <p className="empty-state__message">No daily summary available for this range.</p>
      </div>
    );
  }

  const barLabel = (row: DailySummaryRow) => {
    const d = new Date(row.date);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="bar-chart" role="img" aria-label="Daily booking trend">
      <div className="bar-chart__axis-label">
        <span>{formatNumber(maxCount)}</span>
        <span>0</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '160px', flex: 1 }}>
        {rows.map((row) => {
          const pct = Math.round((row.count / maxCount) * 100);
          return (
            <div
              key={row.date}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', minWidth: 0 }}
            >
              <span className="bar-chart__bar-label">{formatNumber(row.count)}</span>
              <div
                className="bar-chart__bar"
                style={{ height: `${Math.max(pct, 2)}%`, width: '100%', minWidth: '8px' }}
                title={`${barLabel(row)}: ${formatNumber(row.count)} bookings (${formatCurrency(row.value)})`}
              />
            </div>
          );
        })}
      </div>
      <div className="bar-chart__labels">
        {rows.map((row) => (
          <span key={row.date} style={{ flex: 1, textAlign: 'center', minWidth: 0 }}>
            {barLabel(row)}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────── Status Distribution ────────────────────── */

interface StatusRow {
  label: string;
  count: number;
  variant: 'confirmed' | 'completed' | 'cancelled';
}

function StatusDistribution({ rows }: { rows: StatusRow[] }) {
  const total = rows.reduce((s, r) => s + r.count, 0);

  if (total === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state__title">No bookings</p>
        <p className="empty-state__message">No booking data available for this range.</p>
      </div>
    );
  }

  return (
    <div className="status-dist" role="img" aria-label="Booking status distribution">
      {rows.map((row) => {
        const pct = Math.round((row.count / total) * 100);
        return (
          <div key={row.variant} className="status-dist__row">
            <span className="status-dist__label">{row.label}</span>
            <div className="status-dist__bar-wrap">
              <div
                className={`status-dist__bar status-dist__bar--${row.variant}`}
                style={{ width: `${Math.max(pct, 1)}%` }}
              />
            </div>
            <span className="status-dist__count">
              {formatNumber(row.count)} ({pct}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════ Dashboard Page ══════════════════════════ */

export function DashboardPage() {
  const [rangeKey, setRangeKey] = useState<RangeKey>('week');
  const [counts, setCounts] = useState<AdminDashboardCountsDto | null>(null);
  const [summary, setSummary] = useState<DailySummaryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const range: DateRange = RANGE_PRESETS[rangeKey]();

  const load = useCallback(async (r: DateRange) => {
    setLoading(true);
    setError(null);
    try {
      const [countsResult, summaryResult] = await Promise.all([
        getAdminDashboard(r),
        getDailySummary({ dateFrom: r.start, dateTo: r.end }),
      ]);
      setCounts(countsResult);
      setSummary(summaryResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [range.start, range.end, load]);

  const confirmedCount = useMemo(() => {
    if (!counts) return 0;
    return Math.max(0, counts.totalBookings - counts.completedBookings - counts.cancelledBookings);
  }, [counts]);

  const statusRows: StatusRow[] = useMemo(
    () => [
      { label: 'Confirmed', count: confirmedCount, variant: 'confirmed' },
      { label: 'Completed', count: counts?.completedBookings ?? 0, variant: 'completed' },
      { label: 'Cancelled', count: counts?.cancelledBookings ?? 0, variant: 'cancelled' },
    ],
    [confirmedCount, counts],
  );

  const rangeLabel =
    rangeKey === 'today' ? 'today' : rangeKey === 'week' ? 'this week' : 'this month';

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of owners, turfs, and booking activity."
        actions={
          <div className="dashboard-filters">
            <div className="filters" role="group" aria-label="Date range">
              {(['today', 'week', 'month'] as RangeKey[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`btn btn--sm ${rangeKey === key ? 'btn--primary' : 'btn--secondary'}`}
                  onClick={() => setRangeKey(key)}
                >
                  {key === 'today' ? 'Today' : key === 'week' ? 'This Week' : 'This Month'}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* ── Loading ── */}
      {loading && !counts && <Spinner label="Loading dashboard..." />}

      {/* ── Error ── */}
      {error && !loading && (
        <ErrorState message={error} onRetry={() => void load(range)} />
      )}

      {/* ── Empty ── */}
      {!loading && !error && !counts && (
        <EmptyState
          title="No data available"
          message="Dashboard data could not be loaded."
        />
      )}

      {/* ── Content ── */}
      {!loading && !error && counts && (
        <>
          {/* Row 1: Core KPIs */}
          <div className="metric-grid" style={{ marginBottom: '16px' }}>
            <MetricCard
              label="Total Turf Owners"
              value={formatNumber(counts.totalTurfOwners)}
              icon={<IconOwners />}
              iconColor="blue"
              to="/owners"
            />
            <MetricCard
              label="Active Turfs"
              value={formatNumber(counts.activeTurfs)}
              icon={<IconTurfs />}
              iconColor="green"
              to="/turfs?status=ACTIVE"
            />
            <MetricCard
              label="Total Bookings"
              value={formatNumber(counts.totalBookings)}
              icon={<IconBookings />}
              iconColor="info"
              to="/bookings"
            />
            <MetricCard
              label="Total Revenue"
              value={formatCurrency(counts.totalRevenue)}
              icon={<IconRevenue />}
              iconColor="yellow"
              to="/reports"
            />
          </div>

          {/* Row 2: Secondary KPIs */}
          <div className="metric-grid" style={{ marginBottom: '24px' }}>
            <MetricCard
              label="Today's Bookings"
              value={formatNumber(counts.todayBookings)}
              icon={<IconBookings />}
              iconColor="blue"
              to="/bookings?date=today"
            />
            <MetricCard
              label="Pending Turfs"
              value={formatNumber(counts.pendingTurfs)}
              icon={<IconAlert />}
              iconColor="yellow"
              to="/turfs?approvalStatus=SUBMITTED"
            />
            <MetricCard
              label="Completed Bookings"
              value={formatNumber(counts.completedBookings)}
              icon={<IconCheck />}
              iconColor="green"
              to="/bookings?status=COMPLETED"
            />
            <MetricCard
              label="Cancelled Bookings"
              value={formatNumber(counts.cancelledBookings)}
              icon={<IconX />}
              iconColor="red"
              to="/bookings?status=CANCELLED"
            />
          </div>

          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div className="chart-section">
              <div className="chart-section__header">
                <h2 className="chart-section__title">Daily Booking Trend</h2>
              </div>
              <BarChart rows={summary} />
            </div>

            <div className="chart-section">
              <div className="chart-section__header">
                <h2 className="chart-section__title">Booking Status Distribution</h2>
              </div>
              <StatusDistribution rows={statusRows} />
            </div>
          </div>

          {/* Pending Actions & Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="panel">
              <h3 className="panel__title">Pending Actions</h3>
              <div style={{ padding: '4px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span>Turfs awaiting review</span>
                  <span className="metric-card__value" style={{ fontSize: '18px' }}>
                    {formatNumber(counts.pendingTurfs)}
                  </span>
                </div>
                {counts.pendingTurfs > 0 && (
                  <Link
                    to="/turfs?approvalStatus=SUBMITTED"
                    className="btn btn--secondary btn--sm"
                    style={{ marginTop: '12px', display: 'inline-block' }}
                  >
                    Review Turfs
                  </Link>
                )}
                {counts.pendingTurfs === 0 && (
                  <p style={{ margin: '12px 0 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                    No pending actions. All turfs are reviewed.
                  </p>
                )}
              </div>
            </div>

            <div className="panel">
              <h3 className="panel__title">Quick Stats — {rangeLabel}</h3>
              <div style={{ padding: '4px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span>Active Turf Owners</span>
                  <span style={{ fontWeight: 600 }}>{formatNumber(counts.activeTurfOwners)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span>Active Turfs</span>
                  <span style={{ fontWeight: 600 }}>{formatNumber(counts.activeTurfs)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                  <span>Bookings {rangeLabel}</span>
                  <span style={{ fontWeight: 600 }}>{formatNumber(counts.monthBookings)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span>Revenue {rangeLabel}</span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(counts.monthRevenue)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
