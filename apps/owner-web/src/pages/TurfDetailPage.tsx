import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState } from '../components/ui/Feedback.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { useConfirm } from '../components/ui/ConfirmDialog.js';
import { useToast } from '../components/ui/Toast.js';
import { getTurf, submitTurf } from '../services/turfs.service.js';
import type { TurfDetailDto } from '../types/domain.js';
import { statusLabel, fullAddress, formatDateTime } from '../lib/format.js';

export function TurfDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [turf, setTurf] = useState<TurfDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setTurf(await getTurf(id!));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the turf.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const canEdit = turf && (turf.approvalStatus === 'DRAFT' || turf.approvalStatus === 'REJECTED');

  const handleSubmit = () => {
    confirm({
      title: 'Submit turf for review',
      message: `Submit "${turf!.name}" for admin approval? You will not be able to edit it while it is under review.`,
      confirmLabel: 'Submit',
      onConfirm: async () => {
        setSubmitting(true);
        try {
          await submitTurf(turf!.id);
          toast.success('Turf submitted for review.');
          await load();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Unable to submit the turf.');
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  if (loading) return <Spinner />;
  if (error || !turf) return <ErrorState message={error ?? 'Turf not found.'} onRetry={load} />;

  const navLink = (to: string, label: string) => (
    <Link className="btn btn--ghost btn--sm" to={to}>{label}</Link>
  );

  return (
    <div>
      <PageHeader
        title={turf.name}
        subtitle={`${turf.city}, ${turf.state}`}
        actions={
          <>
            {canEdit && (
              <>
                <Link className="btn btn--secondary" to={`/turfs/${turf.id}/edit`}>Edit</Link>
                <Button loading={submitting} onClick={handleSubmit}>Submit for review</Button>
              </>
            )}
            <Link className="btn btn--ghost" to="/turfs">Back</Link>
          </>
        }
      />

      <div className="page-badges">
        <Badge tone={statusTone(turf.approvalStatus)}>{statusLabel(turf.approvalStatus)}</Badge>
        <Badge tone={statusTone(turf.status)}>{statusLabel(turf.status)}</Badge>
      </div>

      {turf.rejectionReason && (
        <p className="alert alert--danger" role="alert">
          Rejected: {turf.rejectionReason}
        </p>
      )}

      <div className="detail-grid">
        <section className="card">
          <h2 className="card__title">Details</h2>
          <dl className="detail-list">
            <div><dt>Description</dt><dd>{turf.description}</dd></div>
            <div><dt>Address</dt><dd>{fullAddress(turf)}</dd></div>
            <div><dt>Contact</dt><dd>{turf.contactPhone}{turf.contactEmail ? ` · ${turf.contactEmail}` : ''}</dd></div>
            <div><dt>Slot duration</dt><dd>{turf.slotDurationMinutes} minutes</dd></div>
            <div><dt>Courts</dt><dd>{turf.courtCount}</dd></div>
            <div><dt>Created</dt><dd>{formatDateTime(turf.createdAt)}</dd></div>
          </dl>
        </section>

        <nav className="card card--nav" aria-label="Turf management">
          <h2 className="card__title">Manage</h2>
          <div className="nav-list">
            {navLink(`/turfs/${turf.id}/courts`, 'Courts')}
            {navLink(`/turfs/${turf.id}/pricing`, 'Pricing rules')}
            {navLink(`/turfs/${turf.id}/hours`, 'Operating hours')}
            {navLink(`/turfs/${turf.id}/availability`, 'Availability')}
            {navLink(`/turfs/${turf.id}/images`, 'Images')}
            {navLink(`/turfs/${turf.id}/features`, 'Sports, facilities & more')}
          </div>
        </nav>
      </div>

      {dialog}
    </div>
  );
}
