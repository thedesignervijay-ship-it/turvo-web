import type { BookingRow } from '../repositories/booking.repo.js';

export interface BookingDto {
  id: string;
  bookingReference: string;
  turfId: string;
  turfName: string;
  courtId: string;
  courtName: string;
  sportId: string;
  sportName: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  baseAmount: number;
  discountAmount: number;
  totalAmount: number;
  bookingSource: 'PHONE' | 'IN_PERSON';
  bookingStatus: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  cancellationReason: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export function serializeBooking(booking: BookingRow): BookingDto {
  return {
    id: booking.id,
    bookingReference: booking.booking_reference,
    turfId: booking.turf_id,
    turfName: booking.turf_name,
    courtId: booking.court_id,
    courtName: booking.court_name,
    sportId: booking.sport_id,
    sportName: booking.sport_name,
    customerName: booking.customer_name,
    customerPhone: booking.customer_phone,
    bookingDate: booking.booking_date,
    startTime: booking.start_time,
    endTime: booking.end_time,
    durationMinutes: booking.duration_minutes,
    baseAmount: booking.base_amount,
    discountAmount: booking.discount_amount,
    totalAmount: booking.total_amount,
    bookingSource: booking.booking_source,
    bookingStatus: booking.booking_status,
    cancellationReason: booking.cancellation_reason,
    cancelledAt: booking.cancelled_at ? booking.cancelled_at.toISOString() : null,
    completedAt: booking.completed_at ? booking.completed_at.toISOString() : null,
    createdAt: booking.created_at.toISOString(),
    updatedAt: booking.updated_at.toISOString(),
  };
}
