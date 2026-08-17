import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState } from '../components/ui/Feedback.js';
import { Field } from '../components/ui/Field.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Button } from '../components/ui/Button.js';
import { useToast } from '../components/ui/Toast.js';
import { listTurfs } from '../services/turfs.service.js';
import { listCourts } from '../services/courts.service.js';
import { createBooking } from '../services/bookings.service.js';
import { validateBooking } from '../validations/schemas.js';
import type { FieldErrors } from '../validations/validators.js';
import type { CourtDto, TurfDetailDto } from '../types/domain.js';
import { todayLocalDate } from '../lib/format.js';
import type { BookingSource } from '@turvo/shared';

interface FormValues {
  turfId: string;
  courtId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  bookingSource: BookingSource | '';
  discountAmount: string;
}

const emptyForm: FormValues = {
  turfId: '',
  courtId: '',
  bookingDate: todayLocalDate(),
  startTime: '',
  endTime: '',
  customerName: '',
  customerPhone: '',
  bookingSource: '',
  discountAmount: '0',
};

export function BookingCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [turfs, setTurfs] = useState<TurfDetailDto[]>([]);
  const [courts, setCourts] = useState<CourtDto[]>([]);
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
        const result = await listTurfs({ page: 1, limit: 100, approvalStatus: 'APPROVED' });
        if (!cancelled) setTurfs(result.items);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Unable to load turfs.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectTurf = async (turfId: string) => {
    setValues((v) => ({ ...v, turfId, courtId: '' }));
    setCourts([]);
    if (!turfId) return;
    try {
      setCourts(await listCourts(turfId));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to load courts.');
    }
  };

  const set = <K extends keyof FormValues>(key: K) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setValues((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setApiError(null);
    const fieldErrors = validateBooking({
      courtId: values.courtId,
      bookingDate: values.bookingDate,
      startTime: values.startTime,
      endTime: values.endTime,
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      bookingSource: values.bookingSource,
      discountAmount: values.discountAmount,
    });
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setSaving(true);
    try {
      const created = await createBooking({
        courtId: values.courtId,
        bookingDate: values.bookingDate,
        startTime: values.startTime,
        endTime: values.endTime,
        customerName: values.customerName.trim(),
        customerPhone: values.customerPhone.trim(),
        bookingSource: values.bookingSource as BookingSource,
        discountAmount: values.discountAmount === '' ? 0 : Number(values.discountAmount),
      });
      toast.success('Booking created.');
      navigate(`/bookings/${created.id}`);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Unable to create the booking.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (loadError) return <ErrorState message={loadError} onRetry={() => window.location.reload()} />;

  return (
    <div>
      <PageHeader
        title="Add booking"
        subtitle="Record a phone or walk-in booking manually."
        actions={<Link className="btn btn--ghost" to="/bookings">Cancel</Link>}
      />

      <form className="form-card" onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <Field label="Turf" error={errors.turfId} required>
            <Select value={values.turfId} onChange={(e) => selectTurf(e.target.value)}>
              <option value="">Select a turf…</option>
              {turfs.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Court" error={errors.courtId} required>
            <Select value={values.courtId} invalid={Boolean(errors.courtId)} disabled={!values.turfId} onChange={set('courtId')}>
              <option value="">{values.turfId ? 'Select a court…' : 'Choose a turf first'}</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="form-grid form-grid--3">
          <Field label="Date" error={errors.bookingDate} required>
            <Input type="date" value={values.bookingDate} invalid={Boolean(errors.bookingDate)} onChange={set('bookingDate')} />
          </Field>
          <Field label="Start time" error={errors.startTime} required>
            <Input type="time" value={values.startTime} invalid={Boolean(errors.startTime)} onChange={set('startTime')} />
          </Field>
          <Field label="End time" error={errors.endTime} required>
            <Input type="time" value={values.endTime} invalid={Boolean(errors.endTime)} onChange={set('endTime')} />
          </Field>
        </div>

        <div className="form-grid">
          <Field label="Customer name" error={errors.customerName} required>
            <Input value={values.customerName} invalid={Boolean(errors.customerName)} onChange={set('customerName')} />
          </Field>
          <Field label="Customer phone" error={errors.customerPhone} required>
            <Input type="tel" value={values.customerPhone} invalid={Boolean(errors.customerPhone)} onChange={set('customerPhone')} />
          </Field>
        </div>

        <div className="form-grid">
          <Field label="Booking source" error={errors.bookingSource} required>
            <Select value={values.bookingSource} invalid={Boolean(errors.bookingSource)} onChange={set('bookingSource')}>
              <option value="">Select…</option>
              <option value="PHONE">Phone</option>
              <option value="IN_PERSON">Walk-in</option>
            </Select>
          </Field>
          <Field label="Discount (₹)" error={errors.discountAmount}>
            <Input type="number" min={0} step="0.01" value={values.discountAmount} invalid={Boolean(errors.discountAmount)} onChange={set('discountAmount')} />
          </Field>
        </div>

        {apiError && <p className="alert alert--danger" role="alert">{apiError}</p>}

        <div className="form-actions">
          <Button type="submit" loading={saving}>Create booking</Button>
          <Link className="btn btn--ghost" to="/bookings">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
