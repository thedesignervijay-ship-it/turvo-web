import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState, EmptyState } from '../components/ui/Feedback.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Select } from '../components/ui/Select.js';
import { DataTable, type Column } from '../components/ui/DataTable.js';
import { useToast } from '../components/ui/Toast.js';
import { useConfirm } from '../components/ui/ConfirmDialog.js';
import { listTurfs } from '../services/turfs.service.js';
import { listItems } from '../services/masterData.service.js';
import { listCourts, setCourtStatus } from '../services/courts.service.js';
import { formatDateTime, statusLabel } from '../lib/format.js';
import { MASTER_CATEGORY_CODE } from '@turvo/shared';
import type { CourtDto, MasterItemDto, TurfDetailDto } from '../types/domain.js';

/**
 * Admin courts management (spec sections 20 and 33). Courts belong to a turf,
 * so the page is driven by a turf selector. Admins can view every court and
 * activate/deactivate it through the existing /api/v1 court endpoints.
 */
export function CourtsPage() {
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [turfs, setTurfs] = useState<TurfDetailDto[]>([]);
  const [sports, setSports] = useState<MasterItemDto[]>([]);
  const [selectedTurfId, setSelectedTurfId] = useState('');
  const [courts, setCourts] = useState<CourtDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCourts, setLoadingCourts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState(false);

  const loadOptions = useCallback(async () => {
    setError(null);
    try {
      const [turfResult, sportResult] = await Promise.all([
        listTurfs({ page: 1, limit: 100 }),
        listItems({ page: 1, limit: 100, category: MASTER_CATEGORY_CODE.SPORTS }),
      ]);
      setTurfs(turfResult.items);
      setSports(sportResult.rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load turf options.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCourts = useCallback(async (turfId: string) => {
    setLoadingCourts(true);
    try {
      setCourts(await listCourts(turfId));
    } catch (err) {
      setCourts([]);
      setError(err instanceof Error ? err.message : 'Unable to load courts.');
    } finally {
      setLoadingCourts(false);
    }
  }, []);

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  const handleTurfChange = (turfId: string) => {
    setSelectedTurfId(turfId);
    setError(null);
    if (turfId) void loadCourts(turfId);
    else setCourts([]);
  };

  const sportNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const sport of sports) map.set(sport.id, sport.name);
    return map;
  }, [sports]);

  const toggleStatus = (court: CourtDto) => {
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
            if (selectedTurfId) void loadCourts(selectedTurfId);
          })
          .catch((err: unknown) =>
            toast.error(err instanceof Error ? err.message : 'Unable to update court status.'),
          )
          .finally(() => setActing(false));
      },
    });
  };

  const columns: Column<CourtDto>[] = [
    { key: 'name', header: 'Court', render: (c) => <strong>{c.name}</strong> },
    { key: 'sport', header: 'Sport', render: (c) => sportNameById.get(c.sportId) ?? '—' },
    { key: 'capacity', header: 'Capacity', render: (c) => String(c.capacity) },
    { key: 'status', header: 'Status', render: (c) => <Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge> },
    { key: 'created', header: 'Created', render: (c) => formatDateTime(c.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      render: (c) => (
        <Button
          variant={c.status === 'ACTIVE' ? 'danger' : 'success'}
          size="sm"
          loading={acting}
          onClick={() => toggleStatus(c)}
        >
          {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
        </Button>
      ),
    },
  ];

  const selectedTurf = turfs.find((t) => t.id === selectedTurfId);

  return (
    <div>
      <PageHeader
        title="Courts"
        subtitle="View every court across turfs and manage its status."
      />

      {error && <ErrorState message={error} onRetry={() => (selectedTurfId ? loadCourts(selectedTurfId) : loadOptions())} />}

      {loading ? (
        <Spinner />
      ) : (
        <section className="panel" aria-label="Court selector">
          <div className="filters">
            <Select
              value={selectedTurfId}
              onChange={(e) => handleTurfChange(e.target.value)}
              aria-label="Select turf"
            >
              <option value="">Select a turf…</option>
              {turfs.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            {selectedTurf && (
              <Link className="btn btn--secondary" to={`/turfs/${selectedTurf.id}`}>
                Open turf details
              </Link>
            )}
          </div>
        </section>
      )}

      {!selectedTurfId && !loading && (
        <EmptyState title="Select a turf" message="Choose a turf to view and manage its courts." />
      )}

      {selectedTurfId && loadingCourts && !courts.length && <Spinner />}

      {selectedTurfId && !loadingCourts && (
        <section className="panel" aria-label="Courts">
          <h2 className="panel__title">Courts · {selectedTurf?.name}</h2>
          {courts.length === 0 ? (
            <EmptyState title="No courts found" message="This turf has not added any courts yet." />
          ) : (
            <DataTable columns={columns} rows={courts} rowKey={(c) => c.id} />
          )}
        </section>
      )}

      {dialog}
    </div>
  );
}
