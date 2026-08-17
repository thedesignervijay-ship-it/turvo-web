import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, EmptyState } from '../components/ui/Feedback.js';
import { DataTable, type Column } from '../components/ui/DataTable.js';
import { Pagination } from '../components/ui/Pagination.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Button } from '../components/ui/Button.js';
import { useConfirm } from '../components/ui/ConfirmDialog.js';
import { useToast } from '../components/ui/Toast.js';
import { listTurfs, submitTurf } from '../services/turfs.service.js';
import type { TurfDetailDto } from '../types/domain.js';
import { statusLabel, formatDate } from '../lib/format.js';

export function TurfsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [items, setItems] = useState<TurfDetailDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const page = Number(searchParams.get('page') ?? '1');
  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? '';
  const approvalStatus = searchParams.get('approvalStatus') ?? '';

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
      const result = await listTurfs({
        page,
        limit: 10,
        search: search || undefined,
        status: (status || undefined) as 'ACTIVE' | 'INACTIVE' | undefined,
        approvalStatus: (approvalStatus || undefined) as 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | undefined,
      });
      setItems(result.items);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load your turfs.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, approvalStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = (turf: TurfDetailDto) => {
    confirm({
      title: 'Submit turf for review',
      message: `Submit "${turf.name}" for admin approval? You will not be able to edit it while it is under review.`,
      confirmLabel: 'Submit',
      onConfirm: async () => {
        setSubmittingId(turf.id);
        try {
          await submitTurf(turf.id);
          toast.success('Turf submitted for review.');
          await load();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Unable to submit the turf.');
        } finally {
          setSubmittingId(null);
        }
      },
    });
  };

  const canEdit = (t: TurfDetailDto) => t.approvalStatus === 'DRAFT' || t.approvalStatus === 'REJECTED';

  const columns: Column<TurfDetailDto>[] = [
    {
      key: 'name',
      header: 'Turf',
      render: (t) => (
        <>
          <Link to={`/turfs/${t.id}`}>{t.name}</Link>
          <span className="cell-sub">{t.city}, {t.state}</span>
        </>
      ),
    },
    {
      key: 'approvalStatus',
      header: 'Approval',
      render: (t) => <Badge tone={statusTone(t.approvalStatus)}>{statusLabel(t.approvalStatus)}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <Badge tone={statusTone(t.status)}>{statusLabel(t.status)}</Badge>,
    },
    { key: 'courtCount', header: 'Courts', render: (t) => String(t.courtCount) },
    { key: 'createdAt', header: 'Created', render: (t) => formatDate(t.createdAt) },
    {
      key: 'actions',
      header: '',
      render: (t) => (
        <div className="row-actions">
          <Link className="btn btn--ghost btn--sm" to={`/turfs/${t.id}`}>View</Link>
          {canEdit(t) && (
            <>
              <Link className="btn btn--ghost btn--sm" to={`/turfs/${t.id}/edit`}>Edit</Link>
              <Button variant="secondary" size="sm" loading={submittingId === t.id} onClick={() => handleSubmit(t)}>
                Submit
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="My Turfs"
        subtitle="Create and manage your turf profiles, then submit them for approval."
        actions={
          <Link className="btn btn--primary" to="/turfs/new">Add turf</Link>
        }
      />

      <div className="filters">
        <Input
          type="search"
          placeholder="Search turfs…"
          value={search}
          onChange={(e) => updateParams({ page: '1', search: e.target.value })}
        />
        <Select value={approvalStatus} onChange={(e) => updateParams({ page: '1', approvalStatus: e.target.value })} aria-label="Filter by approval status">
          <option value="">All approval statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </Select>
        <Select value={status} onChange={(e) => updateParams({ page: '1', status: e.target.value })} aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </div>

      {error && <p className="alert alert--danger" role="alert">{error}</p>}

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState
          title="No turfs yet"
          message="Create your first turf to start onboarding courts, pricing and availability."
        />
      ) : (
        <>
          <DataTable columns={columns} rows={items} rowKey={(t) => t.id} emptyTitle="No turfs found" />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => updateParams({ page: String(p) })} />
        </>
      )}

      {dialog}
    </div>
  );
}
