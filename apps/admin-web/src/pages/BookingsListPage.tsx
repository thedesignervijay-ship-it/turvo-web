import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Pagination } from '../components/ui/Pagination.js';
import { Spinner, EmptyState, ErrorState } from '../components/ui/Feedback.js';
import { formatDate, formatCurrency, statusLabel, trimTimeSeconds } from '../lib/format.js';
import { listBookings } from '../services/bookings.service.js';
import { getAdminDashboard, type AdminDashboardCountsDto } from '../services/dashboard.service.js';
import { listTurfs } from '../services/turfs.service.js';
import { listCourts } from '../services/courts.service.js';
import type { BookingStatus } from '@turvo/shared';
import type { BookingDto, CourtDto, TurfDetailDto } from '../types/domain.js';

const PAGE_SIZE = 20;

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: string;
  tone: 'blue' | 'green' | 'yellow' | 'red' | 'info';
}) {
  return (
    <div className="metric-card">
      <div className="metric-card__header">
        <span className={`metric-card__icon metric-card__icon--${tone}`}>{icon}</span>
        <span className="metric-card__label">{label}</span>
      </div>
      <p className="metric-card__value">{value}</p>
    </div>
  );
}

export function BookingsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<BookingStatus | ''>('');
  const [turfId, setTurfId] = useState('');
  const [courtId, setCourtId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [rows, setRows] = useState<BookingDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<AdminDashboardCountsDto | null>(null);
  const [turfs, setTurfs] = useState<TurfDetailDto[]>([]);
  const [courts, setCourts] = useState<CourtDto[]>([]);

  const [selectedBooking, setSelectedBooking] = useState<BookingDto | null>(null);

  useEffect(() => {
    listTurfs({ page: 1, limit: 100 })
      .then((result) => setTurfs(result.items))
      .catch(() => setTurfs([]));
  }, []);

  useEffect(() => {
    if (!turfId) {
      setCourts([]);
      return;
    }
    listCourts(turfId)
      .then(setCourts)
      .catch(() => setCourts([]));
  }, [turfId]);

  useEffect(() => {
    getAdminDashboard({ start: '', end: '' })
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listBookings({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: status || undefined,
        turfId: turfId || undefined,
        courtId: courtId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setRows(result.rows);
      setTotal(result.total);
      setTotalPages(Math.ceil(result.total / PAGE_SIZE) || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, turfId, courtId, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div>
      <PageHeader title="Bookings" subtitle="All turf bookings across owners." />

      {stats && (
        <div className="metric-grid">
          <StatCard
            label="Total Bookings"
            value={String(stats.totalBookings)}
            icon="&#128203;"
            tone="blue"
          />
          <StatCard
            label="Today's Bookings"
            value={String(stats.todayBookings)}
            icon="&#128197;"
            tone="green"
          />
          <StatCard
            label="Confirmed"
            value={String(stats.monthBookings)}
            icon="&#9989;"
            tone="info"
          />
          <StatCard
            label="Completed"
            value={String(stats.completedBookings)}
            icon="&#10003;"
            tone="green"
          />
          <StatCard
            label="Cancelled"
            value={String(stats.cancelledBookings)}
            icon="&#10007;"
            tone="red"
          />
          <StatCard
            label="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon="&#128176;"
            tone="yellow"
          />
        </div>
      )}

      <div className="panel">
        <div className="filters">
          <input
            type="search"
            className="input"
            placeholder="Search reference or customer…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setSearch(searchInput);
                setPage(1);
              }
            }}
          />
          <select
            className="select"
            value={status}
            onChange={(e) => { setStatus((e.target.value || '') as BookingStatus | ''); setPage(1); }}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <select
            className="select"
            value={turfId}
            onChange={(e) => { setTurfId(e.target.value); setCourtId(''); setPage(1); }}
            aria-label="Filter by turf"
          >
            <option value="">All turfs</option>
            {turfs.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <select
            className="select"
            value={courtId}
            onChange={(e) => { setCourtId(e.target.value); setPage(1); }}
            aria-label="Filter by court"
            disabled={!turfId}
          >
            <option value="">{turfId ? 'All courts' : 'Select a turf first'}</option>
            {courts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="date"
            className="input"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            aria-label="From date"
          />
          <input
            type="date"
            className="input"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            aria-label="To date"
          />
        </div>

        {error && <ErrorState message={error} onRetry={load} />}

        {loading && !rows.length ? (
          <Spinner />
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Customer</th>
                    <th>Turf</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState title="No bookings found" message="Try adjusting the filters." />
                      </td>
                    </tr>
                  ) : (
                    rows.map((b) => (
                      <tr key={b.id} onClick={() => setSelectedBooking(b)} style={{ cursor: 'pointer' }}>
                        <td>
                          <strong>{b.bookingReference}</strong>
                        </td>
                        <td>
                          <div>{b.customerName}</div>
                          <div className="cell-sub">{b.customerPhone}</div>
                        </td>
                        <td>{b.turfName} &middot; {b.courtName}</td>
                        <td>{formatDate(b.bookingDate)}</td>
                        <td>{trimTimeSeconds(b.startTime)}&ndash;{trimTimeSeconds(b.endTime)}</td>
                        <td>{formatCurrency(b.totalAmount)}</td>
                        <td>
                          <Badge tone={statusTone(b.bookingStatus)}>{statusLabel(b.bookingStatus)}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      {selectedBooking && (
        <Modal
          open
          title={`Booking ${selectedBooking.bookingReference}`}
          onClose={() => setSelectedBooking(null)}
          footer={
            <Button variant="ghost" onClick={() => setSelectedBooking(null)}>
              Close
            </Button>
          }
        >
          <div className="detail-list">
            <Section title="Booking Details">
              <Row label="Reference" value={selectedBooking.bookingReference} />
              <Row label="Status" value={<Badge tone={statusTone(selectedBooking.bookingStatus)}>{statusLabel(selectedBooking.bookingStatus)}</Badge>} />
              <Row label="Source" value={statusLabel(selectedBooking.bookingSource)} />
              <Row label="Created" value={formatDate(selectedBooking.createdAt)} />
            </Section>

            <Section title="Customer">
              <Row label="Name" value={selectedBooking.customerName} />
              <Row label="Phone" value={selectedBooking.customerPhone} />
            </Section>

            <Section title="Venue">
              <Row label="Turf" value={selectedBooking.turfName} />
              <Row label="Court" value={selectedBooking.courtName} />
              <Row label="Sport" value={selectedBooking.sportName} />
            </Section>

            <Section title="Schedule">
              <Row label="Date" value={formatDate(selectedBooking.bookingDate)} />
              <Row label="Time" value={`${trimTimeSeconds(selectedBooking.startTime)} – ${trimTimeSeconds(selectedBooking.endTime)}`} />
              <Row label="Duration" value={`${selectedBooking.durationMinutes} min`} />
            </Section>

            <Section title="Payment">
              <Row label="Base Amount" value={formatCurrency(selectedBooking.baseAmount)} />
              <Row label="Discount" value={formatCurrency(selectedBooking.discountAmount)} />
              <Row label="Total" value={<strong>{formatCurrency(selectedBooking.totalAmount)}</strong>} />
            </Section>

            {(selectedBooking.bookingStatus === 'CANCELLED') && (
              <Section title="Cancellation">
                <Row label="Reason" value={selectedBooking.cancellationReason ?? '—'} />
                <Row label="Cancelled At" value={selectedBooking.cancelledAt ? formatDate(selectedBooking.cancelledAt) : '—'} />
              </Section>
            )}

            {selectedBooking.completedAt && (
              <Section title="Completion">
                <Row label="Completed At" value={formatDate(selectedBooking.completedAt)} />
              </Section>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="panel" style={{ marginBottom: '1rem' }}>
      <h3 className="panel__title">{title}</h3>
      <div className="detail-list">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="detail-list__row">
      <span className="detail-list__label">{label}</span>
      <span className="detail-list__value">{value}</span>
    </div>
  );
}
