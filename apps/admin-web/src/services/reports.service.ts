import { apiClient } from '../lib/apiClient.js';
import type { QueryParams, RowsPage } from '../types/api.js';
import type {
  BookingReportDto,
  DailySummaryRow,
  OwnerReportRow,
  TurfReportRow,
} from '../types/domain.js';
import type { BookingStatus, BookingSource } from '@turvo/shared';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  turfId?: string;
  courtId?: string;
  sportId?: string;
  status?: BookingStatus;
  bookingSource?: BookingSource;
  ownerId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  sortOrder?: 'asc' | 'desc';
}

/** GET /reports/booking-report — paginated booking report. */
export async function bookingReport(params: ReportFilters): Promise<RowsPage<BookingReportDto>> {
  return apiClient.get<RowsPage<BookingReportDto>>(
    '/reports/booking-report',
    params as unknown as QueryParams,
  );
}

/** GET /reports/booking-report/export — downloads the CSV file. */
export async function exportBookingReportCsv(params: ReportFilters): Promise<void> {
  await apiClient.download(
    '/reports/booking-report/export',
    params as unknown as QueryParams,
    'booking-report.csv',
  );
}

/** GET /reports/daily-summary — booking value by day (excludes cancelled). */
export async function dailySummary(params: ReportFilters): Promise<DailySummaryRow[]> {
  return apiClient.get<DailySummaryRow[]>('/reports/daily-summary', params as unknown as QueryParams);
}

/** GET /reports/cancellations — cancelled bookings with reasons. */
export async function cancellations(params: ReportFilters): Promise<BookingReportDto[]> {
  return apiClient.get<BookingReportDto[]>('/reports/cancellations', params as unknown as QueryParams);
}

/** GET /reports/owner-report — per-owner bookings (admin). */
export async function ownerReport(params: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<OwnerReportRow[]> {
  return apiClient.get<OwnerReportRow[]>('/reports/owner-report', params as unknown as QueryParams);
}

/** GET /reports/turf-report — per-turf bookings (admin). */
export async function turfReport(params: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<TurfReportRow[]> {
  return apiClient.get<TurfReportRow[]>('/reports/turf-report', params as unknown as QueryParams);
}
