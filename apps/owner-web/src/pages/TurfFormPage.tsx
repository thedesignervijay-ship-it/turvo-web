import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Field } from '../components/ui/Field.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Textarea } from '../components/ui/Textarea.js';
import { Button } from '../components/ui/Button.js';
import { Spinner, EmptyState, ErrorState } from '../components/ui/Feedback.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { useToast } from '../components/ui/Toast.js';
import { getTurf, createTurf, updateTurf } from '../services/turfs.service.js';
import { listAllActiveItems } from '../services/masterData.service.js';
import { validateTurf } from '../validations/schemas.js';
import type { FieldErrors } from '../validations/validators.js';
import type { TurfDetailDto } from '../types/domain.js';
import type { MasterItemDto } from '../types/domain.js';
import { statusLabel } from '../lib/format.js';

interface FormValues {
  name: string;
  description: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  contactPhone: string;
  contactEmail: string;
  slotDurationMinutes: '30' | '60';
  sportIds: string[];
}

const emptyForm: FormValues = {
  name: '',
  description: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  pincode: '',
  contactPhone: '',
  contactEmail: '',
  slotDurationMinutes: '60',
  sportIds: [],
};

export function TurfFormPage() {
  const { id } = useParams<{ id: string }>();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [turf, setTurf] = useState<TurfDetailDto | null>(null);
  const [sports, setSports] = useState<MasterItemDto[]>([]);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [items] = await Promise.all([listAllActiveItems()]);
        if (cancelled) return;
        setSports(items);
        if (editing) {
          const t = await getTurf(id!);
          if (cancelled) return;
          setTurf(t);
          setValues(formFromTurf(t));
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Unable to load turf details.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [editing, id]);

  function formFromTurf(t: TurfDetailDto): FormValues {
    return {
      name: t.name,
      description: t.description,
      addressLine1: t.addressLine1,
      addressLine2: t.addressLine2 ?? '',
      city: t.city,
      state: t.state,
      pincode: t.pincode,
      contactPhone: t.contactPhone,
      contactEmail: t.contactEmail ?? '',
      slotDurationMinutes: String(t.slotDurationMinutes) as '30' | '60',
      sportIds: t.sportIds,
    };
  }

  const set = (key: Exclude<keyof FormValues, 'sportIds'>) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const toggleSport = (sportId: string) => {
    setValues((prev) => ({
      ...prev,
      sportIds: prev.sportIds.includes(sportId)
        ? prev.sportIds.filter((s) => s !== sportId)
        : [...prev.sportIds, sportId],
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError(null);
    const fieldErrors = validateTurf({
      name: values.name,
      description: values.description,
      addressLine1: values.addressLine1,
      addressLine2: values.addressLine2,
      city: values.city,
      state: values.state,
      pincode: values.pincode,
      contactPhone: values.contactPhone,
      contactEmail: values.contactEmail,
      sportIds: values.sportIds,
    });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSaving(true);
    try {
      const payload = {
        name: values.name.trim(),
        description: values.description.trim(),
        addressLine1: values.addressLine1.trim(),
        addressLine2: values.addressLine2.trim() || null,
        city: values.city.trim(),
        state: values.state.trim(),
        pincode: values.pincode.trim(),
        contactPhone: values.contactPhone.trim(),
        contactEmail: values.contactEmail.trim() || null,
        slotDurationMinutes: Number(values.slotDurationMinutes) as 30 | 60,
        sportIds: values.sportIds,
      };
      const saved = editing ? await updateTurf(id!, payload) : await createTurf(payload);
      toast.success(editing ? 'Turf updated.' : 'Turf draft created.');
      navigate(`/turfs/${saved.id}`);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unable to save the turf.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (loadError) return <ErrorState message={loadError} onRetry={() => window.location.reload()} />;

  const locked = editing && turf !== null && turf.approvalStatus !== 'DRAFT' && turf.approvalStatus !== 'REJECTED';

  return (
    <div>
      <PageHeader
        title={editing ? `Edit ${turf?.name ?? 'turf'}` : 'Add turf'}
        subtitle={
          editing
            ? `Approval status: ${turf ? statusLabel(turf.approvalStatus) : '—'}`
            : 'Create a turf draft. Add courts, pricing and availability, then submit for approval.'
        }
        actions={<Link className="btn btn--ghost" to={editing ? `/turfs/${id}` : '/turfs'}>Cancel</Link>}
      />

      {editing && turf && (
        <div className="page-badges">
          <Badge tone={statusTone(turf.approvalStatus)}>{statusLabel(turf.approvalStatus)}</Badge>
          <Badge tone={statusTone(turf.status)}>{statusLabel(turf.status)}</Badge>
        </div>
      )}

      {locked ? (
        <EmptyState
          title="This turf is locked"
          message="Turfs that have been submitted or approved can no longer be edited here."
        />
      ) : (
        <form className="form-card" onSubmit={handleSubmit} noValidate>
          <div className="form-grid">
            <Field label="Name" error={errors.name} required>
              <Input value={values.name} invalid={Boolean(errors.name)} onChange={set('name')} />
            </Field>
            <Field label="Slot duration" error={errors.slotDurationMinutes} hint="Determines booking slot length." required>
              <Select value={values.slotDurationMinutes} onChange={set('slotDurationMinutes')}>
                <option value="30">30 minutes</option>
                <option value="60">60 minutes</option>
              </Select>
            </Field>
          </div>

          <Field label="Description" error={errors.description} required>
            <Textarea rows={4} value={values.description} invalid={Boolean(errors.description)} onChange={set('description')} />
          </Field>

          <div className="form-grid">
            <Field label="Address line 1" error={errors.addressLine1} required>
              <Input value={values.addressLine1} invalid={Boolean(errors.addressLine1)} onChange={set('addressLine1')} />
            </Field>
            <Field label="Address line 2" error={errors.addressLine2}>
              <Input value={values.addressLine2} invalid={Boolean(errors.addressLine2)} onChange={set('addressLine2')} />
            </Field>
          </div>

          <div className="form-grid form-grid--3">
            <Field label="City" error={errors.city} required>
              <Input value={values.city} invalid={Boolean(errors.city)} onChange={set('city')} />
            </Field>
            <Field label="State" error={errors.state} required>
              <Input value={values.state} invalid={Boolean(errors.state)} onChange={set('state')} />
            </Field>
            <Field label="Pincode" error={errors.pincode} required>
              <Input value={values.pincode} invalid={Boolean(errors.pincode)} onChange={set('pincode')} />
            </Field>
          </div>

          <div className="form-grid">
            <Field label="Contact phone" error={errors.contactPhone} required>
              <Input type="tel" value={values.contactPhone} invalid={Boolean(errors.contactPhone)} onChange={set('contactPhone')} />
            </Field>
            <Field label="Contact email" error={errors.contactEmail}>
              <Input type="email" value={values.contactEmail} invalid={Boolean(errors.contactEmail)} onChange={set('contactEmail')} />
            </Field>
          </div>

          <Field label="Sports offered" error={errors.sportIds} hint="Select at least one sport for the turf." required>
            {sports.length === 0 ? (
              <p className="field__hint">No sports are available in the master data yet.</p>
            ) : (
              <div className="check-grid">
                {sports.map((sport) => {
                  const checked = values.sportIds.includes(sport.id);
                  return (
                    <label key={sport.id} className={`check-card${checked ? ' check-card--checked' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => toggleSport(sport.id)} />
                      <span>{sport.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </Field>

          {apiError && <p className="alert alert--danger" role="alert">{apiError}</p>}

          <div className="form-actions">
            <Button type="submit" loading={saving}>{editing ? 'Save changes' : 'Create turf'}</Button>
            <Link className="btn btn--ghost" to={editing ? `/turfs/${id}` : '/turfs'}>Cancel</Link>
          </div>
        </form>
      )}
    </div>
  );
}
