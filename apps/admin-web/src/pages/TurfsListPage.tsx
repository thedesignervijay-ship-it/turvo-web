import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Pagination } from '../components/ui/Pagination.js';
import { Spinner, EmptyState, ErrorState } from '../components/ui/Feedback.js';
import { Field } from '../components/ui/Field.js';
import { Textarea } from '../components/ui/Textarea.js';
import { useToast } from '../components/ui/Toast.js';
import { useConfirm } from '../components/ui/ConfirmDialog.js';
import { listTurfs, approveTurf, rejectTurf, setTurfStatus } from '../services/turfs.service.js';
import { listCourts } from '../services/courts.service.js';
import { validateRejectTurf } from '../validations/schemas.js';
import type { FieldErrors } from '../validations/validators.js';
import { formatDate, formatDateTime, statusLabel, fullAddress } from '../lib/format.js';
import type { TurfDetailDto } from '../types/domain.js';
import type { CourtDto } from '../types/domain.js';

const PAGE_SIZE = 20;

export function TurfsListPage() {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page') ?? '1') || 1);
  const status = searchParams.get('status') ?? '';
  const approvalStatus = searchParams.get('approvalStatus') ?? '';
  const search = searchParams.get('search') ?? '';
  const [searchInput, setSearchInput] = useState(search);

  const [rows, setRows] = useState<TurfDetailDto[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [acting, setActing] = useState(false);

  // Detail modal state
  const [detailTurf, setDetailTurf] = useState<TurfDetailDto | null>(null);
  const [detailCourts, setDetailCourts] = useState<CourtDto[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Reject modal state
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectErrors, setRejectErrors] = useState<FieldErrors>({});

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
      const result = await listTurfs({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: (status as 'ACTIVE' | 'INACTIVE') || undefined,
        approvalStatus: (approvalStatus as 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED') || undefined,
      });
      setRows(result.items);
      setTotal(result.pagination.total);
      setTotalPages(result.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load turfs.');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, approvalStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  // --- Card click: open detail modal ---
  const openDetail = async (turf: TurfDetailDto) => {
    setDetailTurf(turf);
    setDetailLoading(true);
    setDetailCourts([]);
    try {
      const courts = await listCourts(turf.id);
      setDetailCourts(courts);
    } catch {
      // courts are non-critical, show empty
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailTurf(null);
    setDetailCourts([]);
  };

  // --- Approve ---
  const doApprove = async (turf: TurfDetailDto) => {
    setActing(true);
    try {
      await approveTurf(turf.id);
      toast.success(`${turf.name} approved.`);
      closeDetail();
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to approve turf.');
    } finally {
      setActing(false);
    }
  };

  // --- Reject ---
  const openReject = () => {
    setRejectOpen(true);
    setRejectReason('');
    setRejectErrors({});
  };

  const closeReject = () => {
    setRejectOpen(false);
    setRejectReason('');
    setRejectErrors({});
  };

  const doReject = async () => {
    if (!detailTurf) return;
    const errors = validateRejectTurf({ reason: rejectReason });
    setRejectErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setActing(true);
    try {
      await rejectTurf(detailTurf.id, rejectReason.trim());
      toast.success(`${detailTurf.name} rejected.`);
      closeReject();
      closeDetail();
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to reject turf.');
    } finally {
      setActing(false);
    }
  };

  // --- Status toggle ---
  const toggleStatus = (turf: TurfDetailDto) => {
    const next: 'ACTIVE' | 'INACTIVE' = turf.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    confirm({
      title: `${next === 'ACTIVE' ? 'Activate' : 'Deactivate'} turf`,
      message: `Are you sure you want to ${next === 'ACTIVE' ? 'activate' : 'deactivate'} "${turf.name}"?`,
      confirmLabel: next === 'ACTIVE' ? 'Activate' : 'Deactivate',
      tone: next === 'ACTIVE' ? 'primary' : 'danger',
      onConfirm: async () => {
        setActing(true);
        try {
          await setTurfStatus(turf.id, next);
          toast.success(`${turf.name} ${next === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
          void load();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Unable to update status.');
        } finally {
          setActing(false);
        }
      },
    });
  };

  const REVIEWABLE = ['SUBMITTED', 'UNDER_REVIEW'];

  return (
    <div>
      <PageHeader title="Turfs" subtitle="Review, approve and manage turf registrations." />

      <div className="filters">
        <Input
          type="search"
          placeholder="Search turf or business…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') updateParams({ search: searchInput || undefined, page: undefined });
          }}
        />
        <Select
          value={approvalStatus}
          onChange={(e) => updateParams({ approvalStatus: e.target.value || undefined, page: undefined })}
          aria-label="Filter by approval status"
        >
          <option value="">All approvals</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="UNDER_REVIEW">Under review</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="DRAFT">Draft</option>
        </Select>
        <Select
          value={status}
          onChange={(e) => updateParams({ status: e.target.value || undefined, page: undefined })}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </div>

      {error && <ErrorState message={error} onRetry={load} />}
      {loading && !rows.length ? (
        <Spinner />
      ) : !rows.length ? (
        <EmptyState title="No turfs found" message="Try adjusting the filters." />
      ) : (
        <>
          <div className="card-grid">
            {rows.map((turf) => (
              <div
                key={turf.id}
                className="entity-card"
                role="button"
                tabIndex={0}
                onClick={() => void openDetail(turf)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void openDetail(turf);
                  }
                }}
              >
                <div className="entity-card__header">
                  <div>
                    <h3 className="entity-card__title">{turf.name}</h3>
                    <p className="entity-card__subtitle">{turf.owner.businessName}</p>
                  </div>
                  <Badge tone={statusTone(turf.status)}>{statusLabel(turf.status)}</Badge>
                </div>

                <div className="entity-card__body">
                  <div className="entity-card__row">
                    <span className="entity-card__row-label">City</span>
                    <span className="entity-card__row-value">{turf.city}</span>
                  </div>
                  <div className="entity-card__row">
                    <span className="entity-card__row-label">Sports</span>
                    <span className="entity-card__row-value">{turf.sportIds.length}</span>
                  </div>
                  <div className="entity-card__row">
                    <span className="entity-card__row-label">Courts</span>
                    <span className="entity-card__row-value">{turf.courtCount}</span>
                  </div>
                </div>

                <div className="entity-card__footer">
                  {REVIEWABLE.includes(turf.approvalStatus) ? (
                    <Button variant="primary" size="sm" onClick={(e) => { e.stopPropagation(); openDetail(turf); }}>
                      Review
                    </Button>
                  ) : (
                    <Badge tone={statusTone(turf.approvalStatus)}>{statusLabel(turf.approvalStatus)}</Badge>
                  )}
                  <span className="entity-card__meta">{formatDate(turf.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} total={total} onPageChange={(p) => updateParams({ page: String(p) })} />
        </>
      )}

      {/* ---- Detail Modal ---- */}
      <Modal
        open={detailTurf !== null}
        title={detailTurf?.name ?? ''}
        wide
        onClose={closeDetail}
        footer={
          detailTurf && (
            <>
              <Button variant="ghost" onClick={closeDetail}>
                Close
              </Button>
              {detailTurf.approvalStatus === 'SUBMITTED' || detailTurf.approvalStatus === 'UNDER_REVIEW' ? (
                <>
                  <Button variant="success" loading={acting} onClick={() => void doApprove(detailTurf)}>
                    Approve
                  </Button>
                  <Button variant="danger" loading={acting} onClick={openReject}>
                    Reject
                  </Button>
                </>
              ) : detailTurf.approvalStatus === 'APPROVED' ? (
                <Button
                  variant={detailTurf.status === 'ACTIVE' ? 'danger' : 'primary'}
                  loading={acting}
                  onClick={() => toggleStatus(detailTurf)}
                >
                  {detailTurf.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                </Button>
              ) : null}
            </>
          )
        }
      >
        {detailTurf && (
          <div className="detail-grid">
            <dl className="detail-list">
              <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Turf Details</h3>
              <div className="detail-list__row">
                <dt>Description</dt>
                <dd>{detailTurf.description || '—'}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Slot duration</dt>
                <dd>{detailTurf.slotDurationMinutes} min</dd>
              </div>
              <div className="detail-list__row">
                <dt>Courts</dt>
                <dd>{detailTurf.courtCount}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Sports</dt>
                <dd>{detailTurf.sportIds.length > 0 ? `${detailTurf.sportIds.length} sport(s)` : '—'}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Status</dt>
                <dd>
                  <Badge tone={statusTone(detailTurf.status)}>{statusLabel(detailTurf.status)}</Badge>
                </dd>
              </div>
              <div className="detail-list__row">
                <dt>Created</dt>
                <dd>{formatDateTime(detailTurf.createdAt)}</dd>
              </div>
            </dl>

            <dl className="detail-list">
              <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Owner &amp; Contact</h3>
              <div className="detail-list__row">
                <dt>Owner</dt>
                <dd>{detailTurf.owner.businessName}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Contact person</dt>
                <dd>{detailTurf.owner.name}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Phone</dt>
                <dd>{detailTurf.contactPhone}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Email</dt>
                <dd>{detailTurf.contactEmail ?? '—'}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Address</dt>
                <dd>{fullAddress(detailTurf)}</dd>
              </div>
            </dl>

            <dl className="detail-list">
              <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Approval</h3>
              <div className="detail-list__row">
                <dt>Approval status</dt>
                <dd>
                  <Badge tone={statusTone(detailTurf.approvalStatus)}>
                    {statusLabel(detailTurf.approvalStatus)}
                  </Badge>
                </dd>
              </div>
              {detailTurf.rejectionReason && (
                <div className="detail-list__row">
                  <dt>Rejection reason</dt>
                  <dd>{detailTurf.rejectionReason}</dd>
                </div>
              )}
              <div className="detail-list__row">
                <dt>Submitted</dt>
                <dd>{formatDateTime(detailTurf.submittedAt)}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Approved</dt>
                <dd>{formatDateTime(detailTurf.approvedAt)}</dd>
              </div>
              <div className="detail-list__row">
                <dt>Rejected</dt>
                <dd>{formatDateTime(detailTurf.rejectedAt)}</dd>
              </div>
            </dl>

            <div style={{ gridColumn: '1 / -1' }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>Courts</h3>
              {detailLoading ? (
                <Spinner />
              ) : detailCourts.length > 0 ? (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Sport</th>
                      <th>Capacity</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailCourts.map((court) => (
                      <tr key={court.id}>
                        <td>{court.name}</td>
                        <td>{court.sportId}</td>
                        <td>{court.capacity}</td>
                        <td>
                          <Badge tone={statusTone(court.status)}>{statusLabel(court.status)}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>No courts found.</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* ---- Reject Reason Modal ---- */}
      <Modal
        open={rejectOpen}
        title="Reject turf"
        onClose={closeReject}
        footer={
          <>
            <Button variant="ghost" onClick={closeReject} disabled={acting}>
              Cancel
            </Button>
            <Button variant="danger" loading={acting} onClick={() => void doReject()}>
              Reject turf
            </Button>
          </>
        }
      >
        <Field label="Rejection reason" error={rejectErrors.reason} required>
          <Textarea
            rows={4}
            value={rejectReason}
            invalid={Boolean(rejectErrors.reason)}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Explain why this turf was rejected."
          />
        </Field>
      </Modal>

      {dialog}
    </div>
  );
}
