import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, EmptyState } from '../components/ui/Feedback.js';
import { DataTable, type Column } from '../components/ui/DataTable.js';
import { Pagination } from '../components/ui/Pagination.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { listBookings } from '../services/bookings.service.js';
import type { BookingDto } from '../types/domain.js';
import { formatCurrency, formatDate, statusLabel } from '../lib/format.js';

export function BookingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [items, setItems] = useState<BookingDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const page = Number(searchParams.get('page') ?? '1');
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const dateFrom = searchParams.get('dateFrom') ?? '';
  const dateTo = searchParams.get('dateTo') ?? '';

  const updateParams = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(patch)) {
        if (value === '') next.delete(key);
        else next.set(key, value);
      }
      setSearchParams(next);
    },
    [searchParams, setSearchParams],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listBookings({
        page,
        limit: 10,
        search: search || undefined,
        status: (status || undefined) as 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setItems(result.rows);
      setTotal(result.total);
      setTotalPages(Math.max(1, Math.ceil(result.total / 10)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load bookings.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<BookingDto>[] = [
    { key: 'reference', header: 'Reference', render: (b) => b.bookingReference },
    {
      key: 'customer',
      header: 'Customer',
      render: (b) => (
        <>
          {b.customerName}
          <span className="cell-sub">{b.customerPhone}</span>
        </>
      ),
    },
    {
      key: 'turf',
      header: 'Turf / Court',
      render: (b) => (
        <>
          {b.turfName}
          <span className="cell-sub">{b.courtName}</span>
        </>
      ),
    },
    { key: 'date', header: 'Date', render: (b) => formatDate(b.bookingDate) },
    { key: 'time', header: 'Time', render: (b) => `${b.startTime.slice(0, 5)}–${b.endTime.slice(0, 5)}` },
    { key: 'amount', header: 'Amount', render: (b) => formatCurrency(b.totalAmount) },
    { key: 'status', header: 'Status', render: (b) => <Badge tone={statusTone(b.bookingStatus)}>{statusLabel(b.bookingStatus)}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title="Bookings"
        subtitle="Manage phone and walk-in bookings for your turfs."
        actions={<Link className="btn btn--primary" to="/bookings/new">Add booking</Link>}
      />

      <div className="filters">
        <Input
          type="search"
          placeholder="Search bookings…"
          value={search}
          onChange={(e) => updateParams({ page: '1', search: e.target.value })}
        />
        <Select value={status} onChange={(e) => updateParams({ page: '1', status: e.target.value })} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => updateParams({ page: '1', dateFrom: e.target.value })} aria-label="From date" />
        <Input type="date" value={dateTo} onChange={(e) => updateParams({ page: '1', dateTo: e.target.value })} aria-label="To date" />
      </div>

      {error && <p className="alert alert--danger" role="alert">{error}</p>}

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState title="No bookings" message="Bookings appear here once customers or your team create them." />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(b) => b.id}
            onRowClick={(b) => navigate(`/bookings/${b.id}`)}
          />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => updateParams({ page: String(p) })} />
        </>
      )}
    </div>
  );
}
