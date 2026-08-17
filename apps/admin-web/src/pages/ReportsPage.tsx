import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState, EmptyState } from '../components/ui/Feedback.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { DataTable, type Column } from '../components/ui/DataTable.js';
import { Pagination } from '../components/ui/Pagination.js';
import { useToast } from '../components/ui/Toast.js';
import { bookingReport, exportBookingReportCsv, cancellations, dailySummary, ownerReport, turfReport } from '../services/reports.service.js';
import { listOwners } from '../services/owners.service.js';
import { listTurfs } from '../services/turfs.service.js';
import { listCourts } from '../services/courts.service.js';
import { listItems } from '../services/masterData.service.js';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  statusLabel,
  trimTimeSeconds,
  todayLocalDate,
} from '../lib/format.js';
import { MASTER_CATEGORY_CODE } from '@turvo/shared';
import type { BookingReportDto, CourtDto, DailySummaryRow, MasterItemDto, OwnerReportRow, OwnerWithUserDto, TurfDetailDto, TurfReportRow } from '../types/domain.js';

type ReportTab = 'bookings' | 'value' | 'cancellations' | 'owners' | 'turfs';

const TABS: Array<{ key: ReportTab; label: string }> = [
  { key: 'bookings', label: 'Booking report' },
  { key: 'value', label: 'Booking value' },
  { key: 'cancellations', label: 'Cancellations' },
  { key: 'owners', label: 'Owner report' },
  { key: 'turfs', label: 'Turf report' },
];

const PAGE_SIZE = 20;
const defaultDateTo = todayLocalDate();

export function ReportsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<ReportTab>('bookings');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState(defaultDateTo);

  const [rows, setRows] = useState<BookingReportDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [turfId, setTurfId] = useState('');
  const [sportId, setSportId] = useState('');
  const [courtId, setCourtId] = useState('');

  const [summary, setSummary] = useState<DailySummaryRow[]>([]);
  const [cancelled, setCancelled] = useState<BookingReportDto[]>([]);
  const [ownerRows, setOwnerRows] = useState<OwnerReportRow[]>([]);
  const [turfRows, setTurfRows] = useState<TurfReportRow[]>([]);
  const [owners, setOwners] = useState<OwnerWithUserDto[]>([]);
  const [turfs, setTurfs] = useState<TurfDetailDto[]>([]);
  const [sports, setSports] = useState<MasterItemDto[]>([]);
  const [courts, setCourts] = useState<CourtDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      listOwners({ page: 1, limit: 100 }).catch(() => ({ items: [] })),
      listTurfs({ page: 1, limit: 100 }).catch(() => ({ items: [] })),
      listItems({ page: 1, limit: 100, category: MASTER_CATEGORY_CODE.SPORTS }).catch(() => ({ rows: [] })),
    ]).then(([ownerResult, turfResult, sportResult]) => {
      setOwners(ownerResult.items);
      setTurfs(turfResult.items);
      setSports(sportResult.rows);
    });
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

  const hasRange = Boolean(dateFrom || dateTo);
  const rangeParams = useMemo(
    () => ({ dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }),
    [dateFrom, dateTo],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'bookings') {
        const result = await bookingReport({
          ...rangeParams,
          search: search || undefined,
          status: (status as 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') || undefined,
          bookingSource: (source as 'PHONE' | 'IN_PERSON') || undefined,
          ownerId: ownerId || undefined,
          turfId: turfId || undefined,
          sportId: sportId || undefined,
          courtId: courtId || undefined,
          page,
          limit: PAGE_SIZE,
        });
        setRows(result.rows);
        setTotal(result.total);
        setTotalPages(Math.ceil(result.total / PAGE_SIZE) || 1);
      } else if (tab === 'value') {
        setSummary(await dailySummary(rangeParams));
      } else if (tab === 'cancellations') {
        setCancelled(await cancellations(rangeParams));
      } else if (tab === 'owners') {
        setOwnerRows(await ownerReport(rangeParams));
      } else {
        setTurfRows(await turfReport(rangeParams));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the report.');
    } finally {
      setLoading(false);
    }
  }, [tab, rangeParams, search, status, source, ownerId, turfId, sportId, courtId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const doExport = async () => {
    setExporting(true);
    try {
      await exportBookingReportCsv({
        ...rangeParams,
        search: search || undefined,
        status: (status as 'CONFIRMED' | 'CANCELLED' | 'COMPLETED') || undefined,
        bookingSource: (source as 'PHONE' | 'IN_PERSON') || undefined,
        ownerId: ownerId || undefined,
        turfId: turfId || undefined,
        sportId: sportId || undefined,
        courtId: courtId || undefined,
      });
      toast.success('Booking report download started.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to export the report.');
    } finally {
      setExporting(false);
    }
  };

  const bookingColumns: Column<BookingReportDto>[] = [
    { key: 'reference', header: 'Reference', render: (b) => <strong>{b.bookingReference}</strong> },
    { key: 'date', header: 'Date', render: (b) => `${formatDate(b.bookingDate)} ${trimTimeSeconds(b.startTime)}` },
    { key: 'turf', header: 'Turf', render: (b) => b.turfName },
    { key: 'owner', header: 'Owner', render: (b) => b.ownerName },
    { key: 'customer', header: 'Customer', render: (b) => b.customerName },
    { key: 'total', header: 'Amount', render: (b) => formatCurrency(b.totalAmount) },
    { key: 'source', header: 'Source', render: (b) => statusLabel(b.bookingSource) },
    { key: 'status', header: 'Status', render: (b) => <Badge tone={statusTone(b.bookingStatus)}>{statusLabel(b.bookingStatus)}</Badge> },
  ];

  const summaryValue = summary.reduce((sum, r) => sum + r.value, 0);
  const summaryCount = summary.reduce((sum, r) => sum + r.count, 0);

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Booking activity and business performance."
        actions={
          tab === 'bookings' ? (
            <Button variant="secondary" onClick={doExport} loading={exporting}>Export CSV</Button>
          ) : undefined
        }
      />

      <div className="tabs" role="tablist" aria-label="Report type">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={`tabs__tab${tab === t.key ? ' tabs__tab--active' : ''}`}
            onClick={() => {
              setTab(t.key);
              setPage(1);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="filters">
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} aria-label="From date" />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} aria-label="To date" />
        {tab === 'bookings' && (
          <>
            <Input
              type="search"
              placeholder="Search reference or customer…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
              <option value="">All statuses</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="COMPLETED">Completed</option>
            </Select>
            <Select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }} aria-label="Filter by source">
              <option value="">All sources</option>
              <option value="PHONE">Phone</option>
              <option value="IN_PERSON">In person</option>
            </Select>
            <Select value={ownerId} onChange={(e) => { setOwnerId(e.target.value); setPage(1); }} aria-label="Filter by owner">
              <option value="">All owners</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>{o.businessName}</option>
              ))}
            </Select>
            <Select value={turfId} onChange={(e) => { setTurfId(e.target.value); setCourtId(''); setPage(1); }} aria-label="Filter by turf">
              <option value="">All turfs</option>
              {turfs.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
            <Select value={courtId} onChange={(e) => { setCourtId(e.target.value); setPage(1); }} aria-label="Filter by court" disabled={!turfId}>
              <option value="">{turfId ? 'All courts' : 'Select a turf first'}</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            <Select value={sportId} onChange={(e) => { setSportId(e.target.value); setPage(1); }} aria-label="Filter by sport">
              <option value="">All sports</option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </>
        )}
      </div>

      {error && <ErrorState message={error} onRetry={load} />}

      {loading ? (
        <Spinner />
      ) : tab === 'bookings' ? (
        <>
          <DataTable columns={bookingColumns} rows={rows} rowKey={(b) => b.id} emptyTitle="No bookings found" emptyMessage="Try adjusting the filters." />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      ) : tab === 'value' ? (
        <section className="panel">
          <h2 className="panel__title">Booking value {hasRange ? '' : '(all time)'}</h2>
          <div className="metric-grid">
            <div className="metric-card"><p className="metric-card__label">Total value</p><p className="metric-card__value">{formatCurrency(summaryValue)}</p></div>
            <div className="metric-card"><p className="metric-card__label">Bookings</p><p className="metric-card__value">{formatNumber(summaryCount)}</p></div>
          </div>
          {summary.length === 0 ? (
            <EmptyState title="No data in range" message="Try a wider date range." />
          ) : (
            <DataTable<DailySummaryRow>
              columns={[
                { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
                { key: 'count', header: 'Bookings', render: (r) => formatNumber(r.count) },
                { key: 'value', header: 'Value', render: (r) => formatCurrency(r.value) },
              ]}
              rows={summary}
              rowKey={(r) => r.date}
            />
          )}
        </section>
      ) : tab === 'cancellations' ? (
        <section className="panel">
          <h2 className="panel__title">Cancellations {hasRange ? '' : '(all time)'}</h2>
          {cancelled.length === 0 ? (
            <EmptyState title="No cancellations" message="Nothing was cancelled in this range." />
          ) : (
            <DataTable<BookingReportDto>
              columns={[
                { key: 'reference', header: 'Reference', render: (b) => <strong>{b.bookingReference}</strong> },
                { key: 'date', header: 'Date', render: (b) => formatDate(b.bookingDate) },
                { key: 'turf', header: 'Turf', render: (b) => b.turfName },
                { key: 'customer', header: 'Customer', render: (b) => b.customerName },
                { key: 'reason', header: 'Reason', render: (b) => b.cancellationReason ?? '—' },
                { key: 'amount', header: 'Amount', render: (b) => formatCurrency(b.totalAmount) },
              ]}
              rows={cancelled}
              rowKey={(b) => b.id}
            />
          )}
        </section>
      ) : tab === 'owners' ? (
        <section className="panel">
          <h2 className="panel__title">Owner report {hasRange ? '' : '(all time)'}</h2>
          {ownerRows.length === 0 ? (
            <EmptyState title="No data in range" message="Try a wider date range." />
          ) : (
            <DataTable<OwnerReportRow>
              columns={[
                { key: 'owner', header: 'Owner', render: (r) => <div><strong>{r.businessName}</strong><div className="cell-sub">{r.ownerName}</div></div> },
                { key: 'turfs', header: 'Turfs', render: (r) => formatNumber(r.turfs) },
                { key: 'bookings', header: 'Bookings', render: (r) => formatNumber(r.bookings) },
                { key: 'completed', header: 'Completed', render: (r) => formatNumber(r.completed) },
                { key: 'cancelled', header: 'Cancelled', render: (r) => formatNumber(r.cancelled) },
                { key: 'value', header: 'Booking value', render: (r) => formatCurrency(r.bookingValue) },
              ]}
              rows={ownerRows}
              rowKey={(r) => r.ownerId}
            />
          )}
        </section>
      ) : (
        <section className="panel">
          <h2 className="panel__title">Turf report {hasRange ? '' : '(all time)'}</h2>
          {turfRows.length === 0 ? (
            <EmptyState title="No data in range" message="Try a wider date range." />
          ) : (
            <DataTable<TurfReportRow>
              columns={[
                { key: 'turf', header: 'Turf', render: (r) => <div><strong>{r.turfName}</strong><div className="cell-sub">{r.businessName} · {r.city}</div></div> },
                { key: 'status', header: 'Status', render: (r) => <Badge tone={statusTone(r.status)}>{statusLabel(r.status)}</Badge> },
                { key: 'bookings', header: 'Bookings', render: (r) => formatNumber(r.bookings) },
                { key: 'completed', header: 'Completed', render: (r) => formatNumber(r.completed) },
                { key: 'cancelled', header: 'Cancelled', render: (r) => formatNumber(r.cancelled) },
                { key: 'value', header: 'Booking value', render: (r) => formatCurrency(r.bookingValue) },
              ]}
              rows={turfRows}
              rowKey={(r) => r.turfId}
            />
          )}
        </section>
      )}
    </div>
  );
}
