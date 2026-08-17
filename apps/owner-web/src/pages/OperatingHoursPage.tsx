import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState } from '../components/ui/Feedback.js';
import { Button } from '../components/ui/Button.js';
import { Input } from '../components/ui/Input.js';
import { useToast } from '../components/ui/Toast.js';
import { getAvailability, putOperatingHours } from '../services/availability.service.js';
import { validateOperatingHours } from '../validations/schemas.js';
import type { FieldErrors } from '../validations/validators.js';
import { DAY_NAMES } from '../lib/format.js';

interface DayForm {
  dayOfWeek: number;
  openingTime: string;
  closingTime: string;
  isClosed: boolean;
}

const DEFAULT_DAYS: DayForm[] = DAY_NAMES.map((_, dayOfWeek) => ({
  dayOfWeek,
  openingTime: '09:00',
  closingTime: '21:00',
  isClosed: false,
}));

/** Dates for the current week, one per day of week (Mon–Sun). */
function weekDates(): string[] {
  const today = new Date();
  const dow = today.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + diffToMonday + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
}

export function OperatingHoursPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const [days, setDays] = useState<DayForm[]>(DEFAULT_DAYS);
  const [errors, setErrors] = useState<Record<number, FieldErrors>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const results = await Promise.all(
          weekDates().map((date) =>
            getAvailability(id!, date).then((r) => ({ date, hours: r.operatingHours })),
          ),
        );
        if (cancelled) return;
        const existing = results.map(({ hours }) => ({
          dayOfWeek: hours?.dayOfWeek ?? 0,
          openingTime: hours?.openingTime ?? '09:00',
          closingTime: hours?.closingTime ?? '21:00',
          isClosed: hours?.isClosed ?? false,
        }));
        setDays(existing);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unable to load operating hours.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const updateDay = (dayOfWeek: number, patch: Partial<DayForm>) => {
    setDays((prev) => prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d)));
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const fieldErrors = validateOperatingHours(days);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSaving(true);
    try {
      await putOperatingHours(
        id!,
        days.map((d) => ({
          dayOfWeek: d.dayOfWeek,
          openingTime: d.isClosed ? '00:00' : d.openingTime,
          closingTime: d.isClosed ? '00:00' : d.closingTime,
          isClosed: d.isClosed,
        })),
      );
      toast.success('Operating hours saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to save operating hours.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={() => window.location.reload()} />;

  return (
    <div>
      <PageHeader
        title="Operating hours"
        subtitle="Set weekly opening and closing times. Bookable slots are generated within these hours."
        actions={<Link className="btn btn--ghost" to={`/turfs/${id}`}>Back to turf</Link>}
      />

      <form className="form-card" onSubmit={handleSave} noValidate>
        {days.map((day) => {
          const err = errors[day.dayOfWeek] ?? {};
          return (
            <div key={day.dayOfWeek} className="hours-row">
              <label className="check-card hours-row__closed">
                <input
                  type="checkbox"
                  checked={day.isClosed}
                  onChange={(e) => updateDay(day.dayOfWeek, { isClosed: e.target.checked })}
                />
                <span>{DAY_NAMES[day.dayOfWeek]}</span>
              </label>
              <label className="hours-row__field">
                <span className="hours-row__label">Opens</span>
                <Input
                  type="time"
                  value={day.openingTime.slice(0, 5)}
                  invalid={Boolean(err.openingTime)}
                  disabled={day.isClosed}
                  onChange={(e) => updateDay(day.dayOfWeek, { openingTime: e.target.value })}
                />
              </label>
              <label className="hours-row__field">
                <span className="hours-row__label">Closes</span>
                <Input
                  type="time"
                  value={day.closingTime.slice(0, 5)}
                  invalid={Boolean(err.closingTime)}
                  disabled={day.isClosed}
                  onChange={(e) => updateDay(day.dayOfWeek, { closingTime: e.target.value })}
                />
              </label>
              {(err.openingTime || err.closingTime) && (
                <p className="field__error hours-row__error">{err.openingTime ?? err.closingTime}</p>
              )}
            </div>
          );
        })}

        <div className="form-actions">
          <Button type="submit" loading={saving}>Save hours</Button>
          <Link className="btn btn--ghost" to={`/turfs/${id}`}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}
