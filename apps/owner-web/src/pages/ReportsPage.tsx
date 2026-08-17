import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState, EmptyState } from '../components/ui/Feedback.js';
import { DataTable, type Column } from '../components/ui/DataTable.js';
import { Pagination } from '../components/ui/Pagination.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { Input } from '../components/ui/Input.js';
import { Button } from '../components/ui/Button.js';
import { useToast } from '../components/ui/Toast.js';
import {
  bookingReport,
  exportBookingReportCsv,
  dailySummary,
  cancellations,
  earningsSummary,
  type ReportFilters,
} from '../services/reports.service.js';
import type { BookingReportDto, DailySummaryRow, EarningsSummaryDto } from '../types/domain.js';
import { formatCurrency, formatDate, statusLabel, rangeThisMonth } from '../lib/format.js';

export function ReportsPage() {
  const toast = useToast();
  const month = rangeThisMonth();

  const [filters, setFilters] = useState<ReportFilters>({ dateFrom: month.start, dateTo: month.end, page: 1, limit: 10 });
  const [rows, setRows] = useState<BookingReportDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [daily, setDaily] = useState<DailySummaryRow[]>([]);
  const [cancelled, setCancelled] = useState<BookingReportDto[]>([]);
  const [earnings, setEarnings] = useState<EarningsSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [report, dailyResult, cancelledResult, earningsResult] = await Promise.all([
        bookingReport(filters),
        dailySummary({ dateFrom: filters.dateFrom, dateTo: filters.dateTo }),
        cancellations({ dateFrom: filters.dateFrom, dateTo: filters.dateTo }),
        earningsSummary(),
      ]);
      setRows(report.rows);
      setTotal(report.total);
      setTotalPages(Math.max(1, Math.ceil(report.total / 10)));
      setDaily(dailyResult);
      setCancelled(cancelledResult);
      setEarnings(earningsResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load reports.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = () => {
    setFilters((f) => ({ ...f, page: 1 }));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportBookingReportCsv({ dateFrom: filters.dateFrom, dateTo: filters.dateTo });
      toast.success('Booking report downloaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to export the report.');
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<BookingReportDto>[] = [
    { key: 'reference', header: 'Reference', render: (r) => r.bookingReference },
    {
      key: 'customer',
      header: 'Customer',
      render: (r) => (
        <>
          {r.customerName}
          <span className="cell-sub">{r.customerPhone}</span>
        </>
      ),
    },
    {
      key: 'turf',
      header: 'Turf / Court',
      render: (r) => (
        <>
          {r.turfName}
          <span className="cell-sub">{r.courtName}</span>
        </>
      ),
    },
    { key: 'date', header: 'Date', render: (r) => formatDate(r.bookingDate) },
    { key: 'time', header: 'Time', render: (r) => `${r.startTime.slice(0, 5)}–${r.endTime.slice(0, 5)}` },
    { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.totalAmount) },
    { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.bookingStatus)}>{statusLabel(r.bookingStatus)}</Badge> },
  ];

  if (loading && rows.length === 0) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Earnings, booking activity and cancellations for your business."
        actions={<Button variant="secondary" loading={exporting} onClick={handleExport}>Export CSV</Button>}
      />

      <div className="filters">
        <Input type="date" value={filters.dateFrom ?? ''} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} aria-label="From date" />
        <Input type="date" value={filters.dateTo ?? ''} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} aria-label="To date" />
        <Button variant="secondary" onClick={applyFilters}>Apply</Button>
      </div>

      {earnings && (
        <section aria-label="Earnings summary">
          <div className="metric-grid">
            <div className="metric-card metric-card--info">
              <p className="metric-card__label">Today</p>
              <p className="metric-card__value">{formatCurrency(earnings.todayValue)}</p>
              <p className="metric-card__sub">{earnings.todayCount} booking{earnings.todayCount === 1 ? '' : 's'}</p>
            </div>
            <div className="metric-card metric-card--success">
              <p className="metric-card__label">This month</p>
              <p className="metric-card__value">{formatCurrency(earnings.monthValue)}</p>
              <p className="metric-card__sub">{earnings.monthCount} booking{earnings.monthCount === 1 ? '' : 's'}</p>
            </div>
            <div className="metric-card">
              <p className="metric-card__label">Completed</p>
              <p className="metric-card__value">{formatCurrency(earnings.completedValue)}</p>
              <p className="metric-card__sub">{earnings.completedCount} booking{earnings.completedCount === 1 ? '' : 's'}</p>
            </div>
            <div className="metric-card metric-card--danger">
              <p className="metric-card__label">Cancelled value</p>
              <p className="metric-card__value">{formatCurrency(earnings.cancelledValue)}</p>
              <p className="metric-card__sub">{earnings.cancelledCount} booking{earnings.cancelledCount === 1 ? '' : 's'}</p>
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="card__title">Daily summary</h2>
        {daily.length === 0 ? (
          <p className="empty-state__message">No bookings in the selected range.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Bookings</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((row) => (
                  <tr key={row.date}>
                    <td>{formatDate(row.date)}</td>
                    <td>{row.count}</td>
                    <td>{formatCurrency(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">Booking report</h2>
        {rows.length === 0 ? (
          <EmptyState title="No bookings" message="Adjust the date range to see more bookings." />
        ) : (
          <>
            <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} />
            <Pagination page={filters.page ?? 1} totalPages={totalPages} total={total} onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
          </>
        )}
      </section>

      <section className="card">
        <h2 className="card__title">Cancellations</h2>
        {cancelled.length === 0 ? (
          <p className="empty-state__message">No cancellations in the selected range.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Turf / Court</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {cancelled.map((row) => (
                  <tr key={row.id}>
                    <td>{row.bookingReference}</td>
                    <td>{row.customerName}</td>
                    <td>{row.turfName} · {row.courtName}</td>
                    <td>{formatDate(row.bookingDate)}</td>
                    <td>{formatCurrency(row.totalAmount)}</td>
                    <td>{row.cancellationReason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
