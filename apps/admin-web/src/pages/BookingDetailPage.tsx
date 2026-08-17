import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../components/ui/PageHeader.js';
import { Spinner, ErrorState } from '../components/ui/Feedback.js';
import { Badge, statusTone } from '../components/ui/Badge.js';
import { getBooking } from '../services/bookings.service.js';
import { formatCurrency, formatDate, formatDateTime, statusLabel, trimTimeSeconds } from '../lib/format.js';
import type { BookingDto } from '../types/domain.js';

export function BookingDetailPage() {
  const { bookingId = '' } = useParams();
  const [booking, setBooking] = useState<BookingDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBooking(await getBooking(bookingId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load booking details.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !booking) return <Spinner />;
  if (error && !booking) return <ErrorState message={error} onRetry={load} />;
  if (!booking) return null;

  return (
    <div>
      <PageHeader
        title={booking.bookingReference}
        subtitle={booking.turfName}
        actions={<Badge tone={statusTone(booking.bookingStatus)}>{statusLabel(booking.bookingStatus)}</Badge>}
      />

      {error && <p className="alert alert--danger" role="alert">{error}</p>}

      <div className="detail-grid">
        <section className="panel" aria-label="Booking information">
          <h2 className="panel__title">Booking information</h2>
          <dl className="detail-list">
            <div className="detail-list__row"><dt>Date</dt><dd>{formatDate(booking.bookingDate)}</dd></div>
            <div className="detail-list__row"><dt>Time</dt><dd>{trimTimeSeconds(booking.startTime)} – {trimTimeSeconds(booking.endTime)} ({booking.durationMinutes} min)</dd></div>
            <div className="detail-list__row"><dt>Source</dt><dd>{statusLabel(booking.bookingSource)}</dd></div>
            <div className="detail-list__row"><dt>Created</dt><dd>{formatDateTime(booking.createdAt)}</dd></div>
            {booking.cancellationReason && (
              <div className="detail-list__row"><dt>Cancellation reason</dt><dd>{booking.cancellationReason}</dd></div>
            )}
            {booking.cancelledAt && (
              <div className="detail-list__row"><dt>Cancelled at</dt><dd>{formatDateTime(booking.cancelledAt)}</dd></div>
            )}
          </dl>
        </section>

        <section className="panel" aria-label="Turf and court">
          <h2 className="panel__title">Turf &amp; court</h2>
          <dl className="detail-list">
            <div className="detail-list__row"><dt>Turf</dt><dd>{booking.turfName}</dd></div>
            <div className="detail-list__row"><dt>Court</dt><dd>{booking.courtName}</dd></div>
            <div className="detail-list__row"><dt>Sport</dt><dd>{booking.sportName}</dd></div>
          </dl>
        </section>

        <section className="panel" aria-label="Customer">
          <h2 className="panel__title">Customer</h2>
          <dl className="detail-list">
            <div className="detail-list__row"><dt>Name</dt><dd>{booking.customerName}</dd></div>
            <div className="detail-list__row"><dt>Phone</dt><dd>{booking.customerPhone}</dd></div>
          </dl>
        </section>

        <section className="panel" aria-label="Payment">
          <h2 className="panel__title">Payment</h2>
          <dl className="detail-list">
            <div className="detail-list__row"><dt>Base amount</dt><dd>{formatCurrency(booking.baseAmount)}</dd></div>
            <div className="detail-list__row"><dt>Discount</dt><dd>{formatCurrency(booking.discountAmount)}</dd></div>
            <div className="detail-list__row"><dt>Total</dt><dd><strong>{formatCurrency(booking.totalAmount)}</strong></dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
}
