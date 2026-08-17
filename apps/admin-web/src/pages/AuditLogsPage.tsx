import { useCallback, useEffect, useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader.js';
import { DataTable, type Column } from '../components/ui/DataTable.js';
import { Pagination } from '../components/ui/Pagination.js';
import { Spinner, ErrorState } from '../components/ui/Feedback.js';
import { Badge, type BadgeTone } from '../components/ui/Badge.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { listAuditLogs } from '../services/audit.service.js';
import { formatDateTime, statusLabel } from '../lib/format.js';
import type { AuditLogDto } from '../types/domain.js';

const PAGE_SIZE = 20;
const ACTIONS = [
  'CREATE',
  'UPDATE',
  'DELETE',
  'APPROVE',
  'REJECT',
  'ACTIVATE',
  'DEACTIVATE',
  'LOGIN',
  'LOGOUT',
];

export function AuditLogsPage() {
  const [rows, setRows] = useState<AuditLogDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listAuditLogs({
        page,
        limit: PAGE_SIZE,
        action: action || undefined,
        entityType: entityType || undefined,
        entityId: entityId || undefined,
        from: from ? `${from}T00:00:00.000Z` : undefined,
        to: to ? `${to}T23:59:59.999Z` : undefined,
        search: search || undefined,
      });
      setRows(result.rows);
      setTotal(result.total);
      setTotalPages(Math.ceil(result.total / PAGE_SIZE) || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [page, action, entityType, entityId, from, to, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<AuditLogDto>[] = [
    { key: 'time', header: 'Time', render: (l) => formatDateTime(l.createdAt) },
    { key: 'user', header: 'User', render: (l) => l.userName ?? l.userEmail ?? l.userId },
    { key: 'action', header: 'Action', render: (l) => <Badge tone={actionTone(l.action)}>{statusLabel(l.action)}</Badge> },
    { key: 'entity', header: 'Entity', render: (l) => `${statusLabel(l.entityType)} ${l.entityId}` },
    {
      key: 'changes',
      header: 'Changes',
      render: (l) => {
        const oldV = formatValue(l.oldValue);
        const newV = formatValue(l.newValue);
        if (!oldV && !newV) return '—';
        if (!oldV) return <span className="cell-mono">→ {newV}</span>;
        if (!newV) return <span className="cell-mono">{oldV} →</span>;
        return (
          <span className="cell-mono">
            {oldV} → {newV}
          </span>
        );
      },
    },
    { key: 'ip', header: 'IP', render: (l) => l.ipAddress ?? '—' },
  ];

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="A trail of administrative and owner actions." />

      <div className="filters">
        <Input
          type="search"
          placeholder="Search user, entity or value…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <Select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} aria-label="Filter by action">
          <option value="">All actions</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>{statusLabel(a)}</option>
          ))}
        </Select>
        <Input
          type="text"
          placeholder="Entity type"
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
        />
        <Input
          type="text"
          placeholder="Entity ID"
          value={entityId}
          onChange={(e) => { setEntityId(e.target.value); setPage(1); }}
        />
        <Input
          type="date"
          value={from}
          aria-label="From date"
          onChange={(e) => { setFrom(e.target.value); setPage(1); }}
        />
        <Input
          type="date"
          value={to}
          aria-label="To date"
          onChange={(e) => { setTo(e.target.value); setPage(1); }}
        />
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && !rows.length ? (
        <Spinner />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(l) => l.id}
            emptyTitle="No audit entries found"
            emptyMessage="Try adjusting the filters."
          />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function actionTone(action: string): BadgeTone {
  switch (action) {
    case 'APPROVE':
    case 'ACTIVATE':
      return 'success';
    case 'REJECT':
    case 'DEACTIVATE':
    case 'DELETE':
      return 'danger';
    case 'CREATE':
      return 'info';
    default:
      return 'neutral';
  }
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
