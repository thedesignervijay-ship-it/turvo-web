import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState, EmptyState } from '../components/ui/Feedback.js';
import { DataTable, type Column } from '../components/ui/DataTable.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { Field } from '../components/ui/Field.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Textarea } from '../components/ui/Textarea.js';
import { Button } from '../components/ui/Button.js';
import { Modal } from '../components/ui/Modal.js';
import { useConfirm } from '../components/ui/ConfirmDialog.js';
import { useToast } from '../components/ui/Toast.js';
import { listCourts, createCourt, updateCourt, setCourtStatus } from '../services/courts.service.js';
import { getTurf } from '../services/turfs.service.js';
import { listAllActiveItems } from '../services/masterData.service.js';
import { validateCourt } from '../validations/schemas.js';
import type { FieldErrors } from '../validations/validators.js';
import type { CourtDto, MasterItemDto, TurfDetailDto } from '../types/domain.js';
import { statusLabel, formatDateTime } from '../lib/format.js';

interface FormValues {
  sportId: string;
  name: string;
  description: string;
  capacity: string;
}

const emptyForm: FormValues = { sportId: '', name: '', description: '', capacity: '' };

export function TurfCourtsPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [turf, setTurf] = useState<TurfDetailDto | null>(null);
  const [courts, setCourts] = useState<CourtDto[]>([]);
  const [sports, setSports] = useState<MasterItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CourtDto | null>(null);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, c, sportsItems] = await Promise.all([getTurf(id!), listCourts(id!), listAllActiveItems()]);
      setTurf(t);
      setCourts(c);
      setSports(sportsItems.filter((s) => s.categoryCode === 'SPORTS'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load courts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openCreate = () => {
    setEditing(null);
    setValues(emptyForm);
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (court: CourtDto) => {
    setEditing(court);
    setValues({
      sportId: court.sportId,
      name: court.name,
      description: court.description ?? '',
      capacity: String(court.capacity),
    });
    setErrors({});
    setModalOpen(true);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const fieldErrors = validateCourt(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSaving(true);
    try {
      const payload = {
        sportId: values.sportId,
        name: values.name.trim(),
        description: values.description.trim() || null,
        capacity: values.capacity === '' ? undefined : Number(values.capacity),
      };
      if (editing) {
        await updateCourt(editing.id, payload);
        toast.success('Court updated.');
      } else {
        await createCourt(id!, payload);
        toast.success('Court created.');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save the court.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (court: CourtDto) => {
    const next = court.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    confirm({
      title: next === 'ACTIVE' ? 'Activate court' : 'Deactivate court',
      message: next === 'ACTIVE' ? `Activate "${court.name}" for new bookings?` : `Deactivate "${court.name}"? Existing bookings are unaffected.`,
      confirmLabel: next === 'ACTIVE' ? 'Activate' : 'Deactivate',
      tone: next === 'ACTIVE' ? 'primary' : 'danger',
      onConfirm: async () => {
        try {
          await setCourtStatus(court.id, next);
          toast.success(`Court ${next === 'ACTIVE' ? 'activated' : 'deactivated'}.`);
          await load();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Unable to update court status.');
        }
      },
    });
  };

  const sportName = (sportId: string) => sports.find((s) => s.id === sportId)?.name ?? '—';

  const columns: Column<CourtDto>[] = [
    { key: 'name', header: 'Court', render: (c) => c.name },
    { key: 'sport', header: 'Sport', render: (c) => sportName(c.sportId) },
    { key: 'capacity', header: 'Capacity', render: (c) => String(c.capacity) },
    { key: 'status', header: 'Status', render: (c) => <Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge> },
    { key: 'createdAt', header: 'Created', render: (c) => formatDateTime(c.createdAt) },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div className="row-actions">
          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>Edit</Button>
          <Button variant="ghost" size="sm" onClick={() => toggleStatus(c)}>
            {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <Spinner />;
  if (error || !turf) return <ErrorState message={error ?? 'Turf not found.'} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title={`Courts · ${turf.name}`}
        subtitle="Courts are the bookable units within a turf."
        actions={
          <>
            <Link className="btn btn--ghost" to={`/turfs/${id}`}>Back to turf</Link>
            <Button onClick={openCreate}>Add court</Button>
          </>
        }
      />

      {courts.length === 0 ? (
        <EmptyState title="No courts yet" message="Add your first court to enable bookings." />
      ) : (
        <DataTable columns={columns} rows={courts} rowKey={(c) => c.id} emptyTitle="No courts" />
      )}

      <Modal
        open={modalOpen}
        title={editing ? `Edit ${editing.name}` : 'Add court'}
        onClose={() => setModalOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} loading={saving}>{editing ? 'Save changes' : 'Create court'}</Button>
          </>
        }
      >
        <form onSubmit={handleSave} noValidate>
          <Field label="Sport" error={errors.sportId} required>
            <Select value={values.sportId} invalid={Boolean(errors.sportId)} onChange={(e) => setValues((v) => ({ ...v, sportId: e.target.value }))}>
              <option value="">Select a sport…</option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Court name" error={errors.name} required>
            <Input value={values.name} invalid={Boolean(errors.name)} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
          </Field>
          <Field label="Capacity" error={errors.capacity} hint="Optional. Number of players the court holds.">
            <Input type="number" min={0} value={values.capacity} invalid={Boolean(errors.capacity)} onChange={(e) => setValues((v) => ({ ...v, capacity: e.target.value }))} />
          </Field>
          <Field label="Description" error={errors.description}>
            <Textarea rows={3} value={values.description} invalid={Boolean(errors.description)} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} />
          </Field>
        </form>
      </Modal>

      {dialog}
    </div>
  );
}
