import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState } from '../components/ui/Feedback.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Field } from '../components/ui/Field.js';
import { Textarea } from '../components/ui/Textarea.js';
import { Modal } from '../components/ui/Modal.js';
import { useToast } from '../components/ui/Toast.js';
import { getBooking, cancelBooking, completeBooking } from '../services/bookings.service.js';
import { useConfirm } from '../components/ui/ConfirmDialog.js';
import type { BookingDto } from '../types/domain.js';
import { formatCurrency, formatDate, formatDateTime, statusLabel } from '../lib/format.js';
import { reason } from '../validations/validators.js';

export function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | undefined>(undefined);
  const [working, setWorking] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setBooking(await getBooking(id!));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load the booking.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleComplete = () => {
    confirm({
      title: 'Complete booking',
      message: `Mark booking ${booking!.bookingReference} as completed?`,
      confirmLabel: 'Complete',
      onConfirm: async () => {
        setWorking(true);
        try {
          await completeBooking(booking!.id);
          toast.success('Booking completed.');
          await load();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Unable to complete the booking.');
        } finally {
          setWorking(false);
        }
      },
    });
  };

  const handleCancelSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = reason(cancelReason, 'Cancellation reason');
    setCancelError(err);
    if (err) return;
    setWorking(true);
    try {
      await cancelBooking(booking!.id, cancelReason.trim());
      toast.success('Booking cancelled.');
      setCancelOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to cancel the booking.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) return <Spinner />;
  if (error || !booking) return <ErrorState message={error ?? 'Booking not found.'} onRetry={load} />;

  const canCancel = booking.bookingStatus === 'CONFIRMED';
  const canComplete = booking.bookingStatus === 'CONFIRMED';

  return (
    <div>
      <PageHeader
        title={booking.bookingReference}
        subtitle={`${booking.turfName} · ${booking.courtName}`}
        actions={
          <>
            <Badge tone={statusTone(booking.bookingStatus)}>{statusLabel(booking.bookingStatus)}</Badge>
            <Link className="btn btn--ghost" to="/bookings">Back</Link>
            {canCancel && <Button variant="danger" onClick={() => setCancelOpen(true)}>Cancel booking</Button>}
            {canComplete && <Button variant="success" onClick={handleComplete}>Complete</Button>}
          </>
        }
      />

      <div className="detail-grid">
        <section className="card">
          <h2 className="card__title">Booking details</h2>
          <dl className="detail-list">
            <div><dt>Customer</dt><dd>{booking.customerName} · {booking.customerPhone}</dd></div>
            <div><dt>Date & time</dt><dd>{formatDate(booking.bookingDate)}, {booking.startTime.slice(0, 5)}–{booking.endTime.slice(0, 5)}</dd></div>
            <div><dt>Duration</dt><dd>{booking.durationMinutes} minutes</dd></div>
            <div><dt>Sport</dt><dd>{booking.sportName}</dd></div>
            <div><dt>Source</dt><dd>{statusLabel(booking.bookingSource)}</dd></div>
            <div><dt>Created</dt><dd>{formatDateTime(booking.createdAt)}</dd></div>
          </dl>
        </section>

        <section className="card">
          <h2 className="card__title">Amount</h2>
          <dl className="detail-list">
            <div><dt>Base amount</dt><dd>{formatCurrency(booking.baseAmount)}</dd></div>
            <div><dt>Discount</dt><dd>−{formatCurrency(booking.discountAmount)}</dd></div>
            <div><dt>Total</dt><dd className="detail-list__total">{formatCurrency(booking.totalAmount)}</dd></div>
          </dl>
        </section>
      </div>

      {(booking.bookingStatus === 'CANCELLED' || booking.bookingStatus === 'COMPLETED') && (
        <section className="card">
          <h2 className="card__title">History</h2>
          <dl className="detail-list">
            {booking.cancellationReason && (
              <div><dt>Cancellation reason</dt><dd>{booking.cancellationReason}</dd></div>
            )}
            {booking.cancelledAt && <div><dt>Cancelled at</dt><dd>{formatDateTime(booking.cancelledAt)}</dd></div>}
            {booking.completedAt && <div><dt>Completed at</dt><dd>{formatDateTime(booking.completedAt)}</dd></div>}
          </dl>
        </section>
      )}

      <Modal
        open={cancelOpen}
        title="Cancel booking"
        onClose={() => setCancelOpen(false)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setCancelOpen(false)} disabled={working}>Keep booking</Button>
            <Button variant="danger" onClick={handleCancelSubmit} loading={working}>Cancel booking</Button>
          </>
        }
      >
        <form onSubmit={handleCancelSubmit} noValidate>
          <Field label="Cancellation reason" error={cancelError} required>
            <Textarea rows={3} value={cancelReason} invalid={Boolean(cancelError)} onChange={(e) => setCancelReason(e.target.value)} />
          </Field>
        </form>
      </Modal>

      {dialog}
    </div>
  );
}
