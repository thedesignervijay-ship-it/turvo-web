import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState } from '../components/ui/Feedback.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { DataTable, type Column } from '../components/ui/DataTable.js';
import { useToast } from '../components/ui/Toast.js';
import { useConfirm } from '../components/ui/ConfirmDialog.js';
import { getOwner, setOwnerStatus } from '../services/owners.service.js';
import { listTurfs } from '../services/turfs.service.js';
import { fullAddress, formatDateTime, statusLabel } from '../lib/format.js';
import type { OwnerWithUserDto, TurfDetailDto } from '../types/domain.js';

export function OwnerDetailPage() {
  const { ownerId = '' } = useParams();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [owner, setOwner] = useState<OwnerWithUserDto | null>(null);
  const [turfs, setTurfs] = useState<TurfDetailDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ownerData, turfResult] = await Promise.all([
        getOwner(ownerId),
        listTurfs({ page: 1, limit: 100, ownerId }).catch(() => null),
      ]);
      setOwner(ownerData);
      setTurfs(turfResult?.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load owner details.');
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleStatus = () => {
    if (!owner) return;
    const next = owner.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    confirm({
      title: next === 'ACTIVE' ? 'Activate owner' : 'Deactivate owner',
      message: `Are you sure you want to ${next === 'ACTIVE' ? 'activate' : 'deactivate'} ${owner.user.name}?`,
      confirmLabel: next === 'ACTIVE' ? 'Activate' : 'Deactivate',
      tone: next === 'ACTIVE' ? 'primary' : 'danger',
      onConfirm: () => {
        setActing(true);
        setOwnerStatus(ownerId, next)
          .then(async (updated) => {
            setOwner({ ...updated, user: owner.user });
            const refreshed = await getOwner(ownerId).catch(() => null);
            if (refreshed) setOwner(refreshed);
            toast.success(`Owner ${next === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
          })
          .catch((err: unknown) => toast.error(err instanceof Error ? err.message : 'Unable to update status.'))
          .finally(() => setActing(false));
      },
    });
  };

  if (loading && !owner) return <Spinner />;
  if (error && !owner) return <ErrorState message={error} onRetry={load} />;
  if (!owner) return null;

  const turfColumns: Column<TurfDetailDto>[] = [
    { key: 'name', header: 'Turf', render: (t) => <Link to={`/turfs/${t.id}`}>{t.name}</Link> },
    { key: 'city', header: 'Location', render: (t) => `${t.city}, ${t.state}` },
    { key: 'courts', header: 'Courts', render: (t) => String(t.courtCount) },
    { key: 'approval', header: 'Approval', render: (t) => <Badge tone={statusTone(t.approvalStatus)}>{statusLabel(t.approvalStatus)}</Badge> },
    { key: 'status', header: 'Status', render: (t) => <Badge tone={statusTone(t.status)}>{statusLabel(t.status)}</Badge> },
  ];

  return (
    <div>
      <PageHeader
        title={owner.businessName}
        subtitle={owner.user.name}
        actions={
          <Button variant={owner.status === 'ACTIVE' ? 'danger' : 'success'} onClick={toggleStatus} loading={acting}>
            {owner.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </Button>
        }
      />

      {error && <p className="alert alert--danger" role="alert">{error}</p>}

      <div className="detail-grid">
        <section className="panel" aria-label="Contact information">
          <h2 className="panel__title">Contact information</h2>
          <dl className="detail-list">
            <div className="detail-list__row"><dt>Email</dt><dd>{owner.businessEmail ?? '—'}</dd></div>
            <div className="detail-list__row"><dt>Phone</dt><dd>{owner.businessPhone}</dd></div>
            <div className="detail-list__row"><dt>Address</dt><dd>{fullAddress(owner)}</dd></div>
          </dl>
        </section>

        <section className="panel" aria-label="Account information">
          <h2 className="panel__title">Account information</h2>
          <dl className="detail-list">
            <div className="detail-list__row"><dt>Owner</dt><dd>{owner.user.name}</dd></div>
            <div className="detail-list__row"><dt>Email</dt><dd>{owner.user.email}</dd></div>
            <div className="detail-list__row"><dt>Phone</dt><dd>{owner.user.phone}</dd></div>
            <div className="detail-list__row"><dt>Owner status</dt><dd><Badge tone={statusTone(owner.status)}>{statusLabel(owner.status)}</Badge></dd></div>
            <div className="detail-list__row"><dt>User status</dt><dd><Badge tone={statusTone(owner.user.status)}>{statusLabel(owner.user.status)}</Badge></dd></div>
            <div className="detail-list__row"><dt>Last login</dt><dd>{formatDateTime(owner.user.lastLoginAt)}</dd></div>
            <div className="detail-list__row"><dt>Joined</dt><dd>{formatDateTime(owner.createdAt)}</dd></div>
          </dl>
        </section>
      </div>

      <section className="panel" aria-label="Owner turfs">
        <h2 className="panel__title">Turfs ({turfs.length})</h2>
        {turfs.length === 0 ? (
          <p className="panel__hint">This owner has not registered any turfs yet.</p>
        ) : (
          <DataTable columns={turfColumns} rows={turfs} rowKey={(t) => t.id} />
        )}
      </section>

      {dialog}
    </div>
  );
}
