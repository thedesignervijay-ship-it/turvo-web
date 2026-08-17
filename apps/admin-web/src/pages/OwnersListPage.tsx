import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { DataTable, type Column } from '../components/ui/DataTable.js';
import { Pagination } from '../components/ui/Pagination.js';
import { Spinner, EmptyState, ErrorState } from '../components/ui/Feedback.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Modal } from '../components/ui/Modal.js';
import { useToast } from '../components/ui/Toast.js';
import { useConfirm } from '../components/ui/ConfirmDialog.js';
import { listOwners, getOwner, setOwnerStatus } from '../services/owners.service.js';
import { formatDate, formatDateTime, statusLabel, fullAddress } from '../lib/format.js';
import type { OwnerWithUserDto } from '../types/domain.js';
import type { OwnerStatus } from '@turvo/shared';

type ViewMode = 'card' | 'list';

const PAGE_SIZE = 20;

export function OwnersListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(search);

  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [rows, setRows] = useState<OwnerWithUserDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<OwnerWithUserDto | null>(null);
  const [detailTurfs, setDetailTurfs] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '') next.delete(key);
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
      const result = await listOwners({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: (status as OwnerStatus) || undefined,
      });
      setRows(result.items);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load owners.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = useCallback(async (owner: OwnerWithUserDto) => {
    setSelectedOwner(owner);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailTurfs([]);
    try {
      const full = await getOwner(owner.id);
      setSelectedOwner(full);
      setDetailTurfs((full as any).turfs ?? []);
    } catch {
      // keep the summary owner data already shown
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setSelectedOwner(null);
    setDetailTurfs([]);
  }, []);

  const handleStatusChange = useCallback(
    (owner: OwnerWithUserDto) => {
      const nextStatus: OwnerStatus = owner.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const action = nextStatus === 'ACTIVE' ? 'Activate' : 'Deactivate';

      confirm({
        title: `${action} Owner`,
        message: `Are you sure you want to ${action.toLowerCase()} "${owner.businessName}"? This will ${action.toLowerCase()} the associated user account as well.`,
        confirmLabel: action,
        tone: nextStatus === 'ACTIVE' ? 'primary' : 'danger',
        onConfirm: async () => {
          setStatusLoading(true);
          try {
            await setOwnerStatus(owner.id, nextStatus);
            toast.success(`Owner "${owner.businessName}" has been ${action.toLowerCase()}d.`);
            closeDetail();
            void load();
          } catch (err) {
            toast.error(err instanceof Error ? err.message : `Failed to ${action.toLowerCase()} owner.`);
          } finally {
            setStatusLoading(false);
          }
        },
      });
    },
    [confirm, toast, closeDetail, load],
  );

  const columns: Column<OwnerWithUserDto>[] = [
    {
      key: 'businessName',
      header: 'Business',
      render: (o) => (
        <div>
          <strong>{o.businessName}</strong>
          <div className="cell-sub">{o.user.name}</div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (o) => (
        <div>
          <div>{o.businessEmail ?? '—'}</div>
          <div className="cell-sub">{o.businessPhone}</div>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'Location',
      render: (o) => `${o.city}, ${o.state}`,
    },
    {
      key: 'turfCount',
      header: 'Turfs',
      render: (o) => (o.turfCount != null ? String(o.turfCount) : '—'),
    },
    {
      key: 'ownerStatus',
      header: 'Status',
      render: (o) => <Badge tone={statusTone(o.status)}>{statusLabel(o.status)}</Badge>,
    },
    {
      key: 'createdAt',
      header: 'Joined',
      render: (o) => formatDate(o.createdAt),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Turf Owners"
        subtitle="Search, review and manage turf owners."
      />

      <div className="filters">
        <Input
          type="search"
          placeholder="Search business, owner or email…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              updateParams({ search: searchInput || undefined, page: undefined });
            }
          }}
        />
        <Select
          value={status}
          onChange={(e) => updateParams({ status: e.target.value || undefined, page: undefined })}
          aria-label="Filter by owner status"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
        <div className="view-toggle">
          <button
            type="button"
            className={`view-toggle__btn${viewMode === 'card' ? ' view-toggle__btn--active' : ''}`}
            onClick={() => setViewMode('card')}
            aria-label="Card view"
          >
            Cards
          </button>
          <button
            type="button"
            className={`view-toggle__btn${viewMode === 'list' ? ' view-toggle__btn--active' : ''}`}
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            List
          </button>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && !rows.length ? (
        <Spinner />
      ) : !error && rows.length === 0 ? (
        <EmptyState title="No owners found" message="Try adjusting the filters." />
      ) : viewMode === 'card' ? (
        <>
          <div className="card-grid">
            {rows.map((owner) => (
              <button
                key={owner.id}
                type="button"
                className="entity-card"
                onClick={() => openDetail(owner)}
              >
                <div className="entity-card__header">
                  <div className="entity-card__title">{owner.user.name}</div>
                  <Badge tone={statusTone(owner.status)}>{statusLabel(owner.status)}</Badge>
                </div>
                <div className="entity-card__subtitle">{owner.businessName}</div>
                <div className="entity-card__body">
                  <div className="entity-card__row">
                    <span className="entity-card__row-label">Email</span>
                    <span className="entity-card__row-value">{owner.businessEmail ?? owner.user.email}</span>
                  </div>
                  <div className="entity-card__row">
                    <span className="entity-card__row-label">Phone</span>
                    <span className="entity-card__row-value">{owner.businessPhone}</span>
                  </div>
                  <div className="entity-card__row">
                    <span className="entity-card__row-label">Location</span>
                    <span className="entity-card__row-value">{owner.city}, {owner.state}</span>
                  </div>
                </div>
                <div className="entity-card__footer">
                  <span className="entity-card__meta">
                    {owner.turfCount != null ? `${owner.turfCount} turf${owner.turfCount !== 1 ? 's' : ''}` : 'No turfs'}
                  </span>
                  <span className="entity-card__meta">Joined {formatDate(owner.createdAt)}</span>
                </div>
              </button>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => updateParams({ page: String(p) })} />
        </>
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(o) => o.id}
            emptyTitle="No owners found"
            emptyMessage="Try adjusting the filters."
            onRowClick={(o) => openDetail(o)}
          />
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => updateParams({ page: String(p) })} />
        </>
      )}

      {/* Owner Detail Modal */}
      <Modal
        open={detailOpen}
        title={selectedOwner ? selectedOwner.businessName : 'Owner Details'}
        onClose={closeDetail}
        wide
        footer={
          selectedOwner && (
            <>
              <Button variant="ghost" onClick={closeDetail}>
                Close
              </Button>
              <Button
                variant={selectedOwner.status === 'ACTIVE' ? 'danger' : 'success'}
                loading={statusLoading}
                onClick={() => selectedOwner && handleStatusChange(selectedOwner)}
              >
                {selectedOwner.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </Button>
            </>
          )
        }
      >
        {detailLoading ? (
          <Spinner label="Loading owner details…" />
        ) : selectedOwner ? (
          <div>
            {/* Owner Info */}
            <div className="panel" style={{ marginBottom: '1rem' }}>
              <h3 className="panel__title">Owner Information</h3>
              <div className="detail-list">
                <div className="detail-list__row">
                  <span className="entity-card__row-label">Name</span>
                  <span className="entity-card__row-value">{selectedOwner.user.name}</span>
                </div>
                <div className="detail-list__row">
                  <span className="entity-card__row-label">Email</span>
                  <span className="entity-card__row-value">{selectedOwner.user.email}</span>
                </div>
                <div className="detail-list__row">
                  <span className="entity-card__row-label">Phone</span>
                  <span className="entity-card__row-value">{selectedOwner.user.phone}</span>
                </div>
                <div className="detail-list__row">
                  <span className="entity-card__row-label">Status</span>
                  <span className="entity-card__row-value">
                    <Badge tone={statusTone(selectedOwner.user.status)}>{statusLabel(selectedOwner.user.status)}</Badge>
                  </span>
                </div>
                <div className="detail-list__row">
                  <span className="entity-card__row-label">Last Login</span>
                  <span className="entity-card__row-value">{formatDateTime(selectedOwner.user.lastLoginAt)}</span>
                </div>
              </div>
            </div>

            {/* Business Details */}
            <div className="panel" style={{ marginBottom: '1rem' }}>
              <h3 className="panel__title">Business Details</h3>
              <div className="detail-list">
                <div className="detail-list__row">
                  <span className="entity-card__row-label">Business Name</span>
                  <span className="entity-card__row-value">{selectedOwner.businessName}</span>
                </div>
                <div className="detail-list__row">
                  <span className="entity-card__row-label">Business Email</span>
                  <span className="entity-card__row-value">{selectedOwner.businessEmail ?? '—'}</span>
                </div>
                <div className="detail-list__row">
                  <span className="entity-card__row-label">Business Phone</span>
                  <span className="entity-card__row-value">{selectedOwner.businessPhone}</span>
                </div>
                <div className="detail-list__row">
                  <span className="entity-card__row-label">Address</span>
                  <span className="entity-card__row-value">{fullAddress(selectedOwner)}</span>
                </div>
              </div>
            </div>

            {/* Account Info */}
            <div className="panel" style={{ marginBottom: '1rem' }}>
              <h3 className="panel__title">Account Info</h3>
              <div className="detail-list">
                <div className="detail-list__row">
                  <span className="entity-card__row-label">Owner Status</span>
                  <span className="entity-card__row-value">
                    <Badge tone={statusTone(selectedOwner.status)}>{statusLabel(selectedOwner.status)}</Badge>
                  </span>
                </div>
                <div className="detail-list__row">
                  <span className="entity-card__row-label">Created</span>
                  <span className="entity-card__row-value">{formatDateTime(selectedOwner.createdAt)}</span>
                </div>
                <div className="detail-list__row">
                  <span className="entity-card__row-label">Last Updated</span>
                  <span className="entity-card__row-value">{formatDateTime(selectedOwner.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Associated Turfs */}
            <div className="panel">
              <h3 className="panel__title">Associated Turfs</h3>
              {detailLoading ? (
                <Spinner label="Loading turfs…" />
              ) : detailTurfs.length === 0 ? (
                <EmptyState title="No turfs" message="This owner has no associated turfs." />
              ) : (
                <div className="detail-list">
                  {detailTurfs.map((turf: any) => (
                    <div key={turf.id} className="detail-list__row">
                      <span className="entity-card__row-label">{turf.name}</span>
                      <span className="entity-card__row-value">
                        <Badge tone={statusTone(turf.status)}>{statusLabel(turf.status)}</Badge>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {dialog}
    </div>
  );
}
