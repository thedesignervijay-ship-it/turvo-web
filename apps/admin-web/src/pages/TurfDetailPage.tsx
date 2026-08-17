import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState, EmptyState } from '../components/ui/Feedback.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Field } from '../components/ui/Field.js';
import { Textarea } from '../components/ui/Textarea.js';
import { DataTable, type Column } from '../components/ui/DataTable.js';
import { useToast } from '../components/ui/Toast.js';
import { useConfirm } from '../components/ui/ConfirmDialog.js';
import { getTurf, approveTurf, rejectTurf, setTurfStatus } from '../services/turfs.service.js';
import { listItems } from '../services/masterData.service.js';
import { listCourts, setCourtStatus } from '../services/courts.service.js';
import { validateRejectTurf } from '../validations/schemas.js';
import type { FieldErrors } from '../validations/validators.js';
import { fullAddress, formatDateTime, statusLabel } from '../lib/format.js';
import { MASTER_CATEGORY_CODE } from '@turvo/shared';
import type { CourtDto, MasterItemDto, TurfDetailDto } from '../types/domain.js';

const REVIEWABLE = ['SUBMITTED', 'UNDER_REVIEW'];

export function TurfDetailPage() {
  const { turfId = '' } = useParams();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [turf, setTurf] = useState<TurfDetailDto | null>(null);
  const [courts, setCourts] = useState<CourtDto[]>([]);
  const [sports, setSports] = useState<MasterItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectErrors, setRejectErrors] = useState<FieldErrors>({});
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [turfData, courtList, sportResult] = await Promise.all([
        getTurf(turfId),
        listCourts(turfId).catch(() => []),
        listItems({ page: 1, limit: 100, category: MASTER_CATEGORY_CODE.SPORTS }).catch(() => ({ rows: [] })),
      ]);
      setTurf(turfData);
      setCourts(courtList);
      setSports(sportResult.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load turf details.');
    } finally {
      setLoading(false);
    }
  }, [turfId]);

  useEffect(() => {
    void load();
  }, [load]);

  const doApprove = async () => {
    if (!turf) return;
    setActing(true);
    try {
      await approveTurf(turf.id);
      toast.success(`${turf.name} approved.`);
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to approve turf.');
    } finally {
      setActing(false);
    }
  };

  const doReject = async () => {
    if (!turf) return;
    const errors = validateRejectTurf({ reason: rejectReason });
    setRejectErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setActing(true);
    try {
      await rejectTurf(turf.id, rejectReason.trim());
      toast.success(`${turf.name} rejected.`);
      setRejecting(false);
      setRejectReason('');
      void load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to reject turf.');
    } finally {
      setActing(false);
    }
  };

  const toggleActive = async () => {
    if (!turf) return;
    const next = turf.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
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
  };

  const toggleCourtStatus = (court: CourtDto) => {
    const next = court.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    confirm({
      title: next === 'ACTIVE' ? 'Activate court' : 'Deactivate court',
      message: `Are you sure you want to ${next === 'ACTIVE' ? 'activate' : 'deactivate'} "${court.name}"?`,
      confirmLabel: next === 'ACTIVE' ? 'Activate' : 'Deactivate',
      tone: next === 'ACTIVE' ? 'primary' : 'danger',
      onConfirm: () => {
        setActing(true);
        setCourtStatus(court.id, next)
          .then(() => {
            toast.success(`Court ${next === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
            void load();
          })
          .catch((err: unknown) =>
            toast.error(err instanceof Error ? err.message : 'Unable to update court status.'),
          )
          .finally(() => setActing(false));
      },
    });
  };

  const sportNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const sport of sports) map.set(sport.id, sport.name);
    return map;
  }, [sports]);

  if (loading && !turf) return <Spinner />;
  if (error && !turf) return <ErrorState message={error} onRetry={load} />;
  if (!turf) return null;

  const reviewable = REVIEWABLE.includes(turf.approvalStatus);
  const sportNames = turf.sportIds.map((id) => sportNameById.get(id) ?? id).join(', ');

  const courtColumns: Column<CourtDto>[] = [
    { key: 'name', header: 'Court', render: (c) => <strong>{c.name}</strong> },
    { key: 'sport', header: 'Sport', render: (c) => sportNameById.get(c.sportId) ?? '—' },
    { key: 'capacity', header: 'Capacity', render: (c) => String(c.capacity) },
    { key: 'status', header: 'Status', render: (c) => <Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      render: (c) => (
        <Button
          variant={c.status === 'ACTIVE' ? 'danger' : 'success'}
          size="sm"
          loading={acting}
          onClick={() => toggleCourtStatus(c)}
        >
          {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title={turf.name}
        subtitle={turf.owner.businessName}
        actions={
          <>
            {reviewable && (
              <Button variant="success" onClick={doApprove} loading={acting}>Approve</Button>
            )}
            {reviewable && (
              <Button variant="danger" onClick={() => setRejecting((v) => !v)}>Reject</Button>
            )}
            {turf.approvalStatus === 'APPROVED' && (
              <Button variant={turf.status === 'ACTIVE' ? 'danger' : 'success'} onClick={toggleActive} loading={acting}>
                {turf.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
              </Button>
            )}
          </>
        }
      />

      {error && <p className="alert alert--danger" role="alert">{error}</p>}

      <div className="detail-grid">
        <section className="panel" aria-label="Turf information">
          <h2 className="panel__title">Turf information</h2>
          <dl className="detail-list">
            <div className="detail-list__row"><dt>Owner</dt><dd><Link to={`/owners/${turf.ownerId}`}>{turf.owner.businessName}</Link></dd></div>
            <div className="detail-list__row"><dt>Address</dt><dd>{fullAddress(turf)}</dd></div>
            <div className="detail-list__row"><dt>Contact</dt><dd>{turf.contactPhone}{turf.contactEmail ? ` · ${turf.contactEmail}` : ''}</dd></div>
            <div className="detail-list__row"><dt>Slot duration</dt><dd>{turf.slotDurationMinutes} min</dd></div>
            <div className="detail-list__row"><dt>Courts</dt><dd><Link to={`/courts`}>{turf.courtCount}</Link></dd></div>
            <div className="detail-list__row"><dt>Sports</dt><dd>{turf.sportIds.length > 0 ? sportNames : '—'}</dd></div>
          </dl>
        </section>

        <section className="panel" aria-label="Approval status">
          <h2 className="panel__title">Approval status</h2>
          <dl className="detail-list">
            <div className="detail-list__row">
              <dt>Approval</dt>
              <dd><Badge tone={statusTone(turf.approvalStatus)}>{statusLabel(turf.approvalStatus)}</Badge></dd>
            </div>
            <div className="detail-list__row">
              <dt>Status</dt>
              <dd><Badge tone={statusTone(turf.status)}>{statusLabel(turf.status)}</Badge></dd>
            </div>
            {turf.rejectionReason && (
              <div className="detail-list__row"><dt>Rejection reason</dt><dd>{turf.rejectionReason}</dd></div>
            )}
            <div className="detail-list__row"><dt>Submitted</dt><dd>{formatDateTime(turf.submittedAt)}</dd></div>
            <div className="detail-list__row"><dt>Approved</dt><dd>{formatDateTime(turf.approvedAt)}</dd></div>
            <div className="detail-list__row"><dt>Created</dt><dd>{formatDateTime(turf.createdAt)}</dd></div>
          </dl>
        </section>
      </div>

      {rejecting && (
        <section className="panel" aria-label="Reject turf">
          <h2 className="panel__title">Reject turf</h2>
          <Field label="Rejection reason" error={rejectErrors.reason} required>
            <Textarea
              rows={4}
              value={rejectReason}
              invalid={Boolean(rejectErrors.reason)}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Explain why this turf was rejected."
            />
          </Field>
          <div className="panel__actions">
            <Button variant="ghost" onClick={() => setRejecting(false)} disabled={acting}>Cancel</Button>
            <Button variant="danger" onClick={doReject} loading={acting}>Reject turf</Button>
          </div>
        </section>
      )}

      <section className="panel" aria-label="Courts">
        <h2 className="panel__title">Courts ({courts.length})</h2>
        {courts.length === 0 ? (
          <EmptyState title="No courts found" message="This turf has not added any courts yet." />
        ) : (
          <DataTable columns={courtColumns} rows={courts} rowKey={(c) => c.id} />
        )}
      </section>

      <section className="panel" aria-label="Additional details">
        <h2 className="panel__title">Description</h2>
        <p className="panel__text">{turf.description || 'No description provided.'}</p>
        <p className="panel__hint">
          Availability, operating hours, pricing and images are managed by the turf owner.
        </p>
      </section>

      {dialog}
    </div>
  );
}
