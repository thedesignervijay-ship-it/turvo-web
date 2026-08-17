import type { BookingReportRow } from '../repositories/report.repo.js';

export interface BookingReportDto {
  id: string;
  bookingReference: string;
  turfId: string;
  turfName: string;
  courtId: string;
  courtName: string;
  sportId: string;
  sportName: string;
  ownerId: string;
  ownerName: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  baseAmount: number;
  discountAmount: number;
  totalAmount: number;
  bookingSource: string;
  bookingStatus: string;
  cancellationReason: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export function serializeBookingReport(row: BookingReportRow): BookingReportDto {
  return {
    id: row.id,
    bookingReference: row.booking_reference,
    turfId: row.turf_id,
    turfName: row.turf_name,
    courtId: row.court_id,
    courtName: row.court_name,
    sportId: row.sport_id,
    sportName: row.sport_name,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    bookingDate: row.booking_date,
    startTime: row.start_time,
    endTime: row.end_time,
    durationMinutes: row.duration_minutes,
    baseAmount: row.base_amount,
    discountAmount: row.discount_amount,
    totalAmount: row.total_amount,
    bookingSource: row.booking_source,
    bookingStatus: row.booking_status,
    cancellationReason: row.cancellation_reason,
    cancelledAt: row.cancelled_at ? row.cancelled_at.toISOString() : null,
    completedAt: row.completed_at ? row.completed_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
  };
}

const CSV_COLUMNS: { header: string; value: (r: BookingReportRow) => string }[] = [
  { header: 'booking_reference', value: (r) => r.booking_reference },
  { header: 'booking_date', value: (r) => r.booking_date },
  { header: 'start_time', value: (r) => r.start_time },
  { header: 'end_time', value: (r) => r.end_time },
  { header: 'turf', value: (r) => r.turf_name },
  { header: 'court', value: (r) => r.court_name },
  { header: 'sport', value: (r) => r.sport_name },
  { header: 'owner', value: (r) => r.owner_name },
  { header: 'customer_name', value: (r) => r.customer_name },
  { header: 'customer_phone', value: (r) => r.customer_phone },
  { header: 'source', value: (r) => r.booking_source },
  { header: 'status', value: (r) => r.booking_status },
  { header: 'base_amount', value: (r) => String(r.base_amount) },
  { header: 'discount_amount', value: (r) => String(r.discount_amount) },
  { header: 'total_amount', value: (r) => String(r.total_amount) },
];

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Renders the booking report as CSV (spec section 23: CSV export required). */
export function bookingReportToCsv(rows: BookingReportRow[]): string {
  const lines = [
    CSV_COLUMNS.map((c) => c.header).join(','),
    ...rows.map((row) => CSV_COLUMNS.map((c) => escapeCsv(c.value(row))).join(',')),
  ];
  return lines.join('\n');
}
