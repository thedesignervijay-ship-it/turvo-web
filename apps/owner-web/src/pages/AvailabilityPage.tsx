import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState, EmptyState } from '../components/ui/Feedback.js';
import { Button } from '../components/ui/Button.js';
import { Field } from '../components/ui/Field.js';
import { Input } from '../components/ui/Input.js';
import { Select } from '../components/ui/Select.js';
import { Textarea } from '../components/ui/Textarea.js';
import { Modal } from '../components/ui/Modal.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { useConfirm } from '../components/ui/ConfirmDialog.js';
import { useToast } from '../components/ui/Toast.js';
import { getAvailability, createBlock, deleteBlock } from '../services/availability.service.js';
import { listCourts } from '../services/courts.service.js';
import { validateAvailabilityBlock } from '../validations/schemas.js';
import type { FieldErrors } from '../validations/validators.js';
import type { AvailabilityResponse, CourtDto } from '../types/domain.js';
import { formatCurrency, formatDateTime, statusLabel, todayLocalDate } from '../lib/format.js';
import type { BlockType } from '@turvo/shared';

/** Converts a datetime-local value ("YYYY-MM-DDTHH:mm") to ISO 8601 with the local offset. */
function toIsoWithOffset(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString();
}

export function AvailabilityPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [date, setDate] = useState(todayLocalDate());
  const [data, setData] = useState<AvailabilityResponse | null>(null);
  const [courts, setCourts] = useState<CourtDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [blockOpen, setBlockOpen] = useState(false);
  const [blockValues, setBlockValues] = useState({
    courtId: '',
    startDateTime: '',
    endDateTime: '',
    blockType: 'MAINTENANCE',
    reason: '',
  });
  const [blockErrors, setBlockErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  const load = async (targetDate: string) => {
    setLoading(true);
    setError(null);
    try {
      const [availability, courtList] = await Promise.all([
        getAvailability(id!, targetDate),
        listCourts(id!),
      ]);
      setData(availability);
      setCourts(courtList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load availability.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, date]);

  const slotStates = useMemo(() => {
    if (!data) return { total: 0, available: 0, booked: 0 };
    let total = 0;
    let available = 0;
    let booked = 0;
    for (const court of data.courts) {
      for (const slot of court.slots) {
        total += 1;
        if (slot.available) available += 1;
        else booked += 1;
      }
    }
    return { total, available, booked };
  }, [data]);

  const handleCreateBlock = async (e: FormEvent) => {
    e.preventDefault();
    const fieldErrors = validateAvailabilityBlock({
      courtId: blockValues.courtId,
      startDateTime: blockValues.startDateTime,
      endDateTime: blockValues.endDateTime,
      blockType: blockValues.blockType,
      reason: blockValues.reason,
    });
    setBlockErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;
    setSaving(true);
    try {
      await createBlock(id!, {
        courtId: blockValues.courtId || undefined,
        startDateTime: toIsoWithOffset(blockValues.startDateTime),
        endDateTime: toIsoWithOffset(blockValues.endDateTime),
        blockType: blockValues.blockType as BlockType,
        reason: blockValues.reason.trim() || null,
      });
      toast.success('Availability block created.');
      setBlockOpen(false);
      setBlockValues({ courtId: '', startDateTime: '', endDateTime: '', blockType: 'MAINTENANCE', reason: '' });
      await load(date);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to create the block.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = (blockId: string, label: string) => {
    confirm({
      title: 'Delete availability block',
      message: `Delete the "${label}" block? Blocked slots will become available again.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await deleteBlock(blockId);
          toast.success('Block deleted.');
          await load(date);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Unable to delete the block.');
        }
      },
    });
  };

  const courtName = (courtId: string | null) =>
    courtId ? courts.find((c) => c.id === courtId)?.name ?? 'Court' : 'Whole turf';

  if (loading) return <Spinner />;
  if (error || !data) return <ErrorState message={error ?? 'Unable to load availability.'} onRetry={() => load(date)} />;

  const isClosed = data.operatingHours?.isClosed ?? false;

  return (
    <div>
      <PageHeader
        title="Availability"
        subtitle="Review bookable slots and manage blocks for a specific day."
        actions={
          <>
            <Link className="btn btn--ghost" to={`/turfs/${id}`}>Back to turf</Link>
            <Button onClick={() => setBlockOpen(true)}>Add block</Button>
          </>
        }
      />

      <div className="filters">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>

      <div className="page-badges">
        <Badge tone={statusTone(isClosed ? 'INACTIVE' : 'ACTIVE')}>
          {isClosed ? 'Closed on this day' : `Open ${data.operatingHours?.openingTime ?? '—'}–${data.operatingHours?.closingTime ?? '—'}`}
        </Badge>
        <Badge tone="info">{slotStates.available} of {slotStates.total} slots available</Badge>
      </div>

      {data.courts.length === 0 ? (
        <EmptyState title="No active courts" message="Add active courts before checking availability." />
      ) : (
        <div className="availability-table">
          {data.courts.map((court) => (
            <section key={court.courtId} className="card">
              <h2 className="card__title">{court.name}</h2>
              {court.slots.length === 0 ? (
                <p className="empty-state__message">No slots for this day{isClosed ? ' (closed)' : ''}.</p>
              ) : (
                <div className="slot-grid">
                  {court.slots.map((slot, index) => (
                    <div
                      key={`${court.courtId}-${slot.startTime}-${index}`}
                      className={`slot-chip${slot.available ? ' slot-chip--available' : ' slot-chip--booked'}`}
                      title={slot.available ? `${slot.startTime}–${slot.endTime} · ₹${slot.price ?? 'no pricing'}` : 'Unavailable'}
                    >
                      <span className="slot-chip__time">{slot.startTime.slice(0, 5)}</span>
                      {slot.available && slot.price !== null && (
                        <span className="slot-chip__price">{formatCurrency(slot.price)}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      <section className="card">
        <h2 className="card__title">Blocks for {formatDateTime(`${date}T00:00:00`).split(',')[0]}</h2>
        {data.blocks.length === 0 ? (
          <p className="empty-state__message">No availability blocks on this day.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Court</th>
                <th>Type</th>
                <th>Start</th>
                <th>End</th>
                <th>Reason</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data.blocks.map((block) => (
                <tr key={block.id}>
                  <td>{courtName(block.courtId)}</td>
                  <td><Badge tone="warning">{statusLabel(block.blockType)}</Badge></td>
                  <td>{formatDateTime(block.startDateTime)}</td>
                  <td>{formatDateTime(block.endDateTime)}</td>
                  <td>{block.reason ?? '—'}</td>
                  <td>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteBlock(block.id, block.blockType)}>Delete</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <Modal
        open={blockOpen}
        title="Add availability block"
        onClose={() => setBlockOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setBlockOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleCreateBlock} loading={saving}>Create block</Button>
          </>
        }
      >
        <form onSubmit={handleCreateBlock} noValidate>
          <Field label="Court" error={blockErrors.courtId} hint="Leave empty to block the entire turf.">
            <Select value={blockValues.courtId} onChange={(e) => setBlockValues((v) => ({ ...v, courtId: e.target.value }))}>
              <option value="">Whole turf</option>
              {courts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Block type" error={blockErrors.blockType} required>
            <Select value={blockValues.blockType} onChange={(e) => setBlockValues((v) => ({ ...v, blockType: e.target.value }))}>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="OWNER_BLOCK">Owner block</option>
              <option value="EMERGENCY">Emergency</option>
            </Select>
          </Field>
          <div className="form-grid">
            <Field label="Starts" error={blockErrors.startDateTime} required>
              <Input type="datetime-local" value={blockValues.startDateTime} invalid={Boolean(blockErrors.startDateTime)} onChange={(e) => setBlockValues((v) => ({ ...v, startDateTime: e.target.value }))} />
            </Field>
            <Field label="Ends" error={blockErrors.endDateTime} required>
              <Input type="datetime-local" value={blockValues.endDateTime} invalid={Boolean(blockErrors.endDateTime)} onChange={(e) => setBlockValues((v) => ({ ...v, endDateTime: e.target.value }))} />
            </Field>
          </div>
          <Field label="Reason" error={blockErrors.reason}>
            <Textarea rows={2} value={blockValues.reason} onChange={(e) => setBlockValues((v) => ({ ...v, reason: e.target.value }))} />
          </Field>
        </form>
      </Modal>

      {dialog}
    </div>
  );
}
