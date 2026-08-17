import { apiClient } from '../lib/apiClient.js';
import type { QueryParams, RowsPage } from '../types/api.js';
import type { BookingSource, BookingStatus } from '@turvo/shared';
import type {
  BookingReportDto,
  DailySummaryRow,
  EarningsSummaryDto,
} from '../types/domain.js';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  turfId?: string;
  courtId?: string;
  sportId?: string;
  status?: BookingStatus;
  bookingSource?: BookingSource;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  sortOrder?: 'asc' | 'desc';
}

/** GET /reports/booking-report — owner-scoped paginated booking report. */
export async function bookingReport(params: ReportFilters): Promise<RowsPage<BookingReportDto>> {
  return apiClient.get<RowsPage<BookingReportDto>>(
    '/reports/booking-report',
    params as unknown as QueryParams,
  );
}

/** GET /reports/booking-report/export — downloads the owner-scoped CSV. */
export async function exportBookingReportCsv(params: ReportFilters): Promise<void> {
  await apiClient.download(
    '/reports/booking-report/export',
    params as unknown as QueryParams,
    'booking-report.csv',
  );
}

/** GET /reports/daily-summary — booking value by day (excludes cancellations). */
export async function dailySummary(params: ReportFilters): Promise<DailySummaryRow[]> {
  return apiClient.get<DailySummaryRow[]>('/reports/daily-summary', params as unknown as QueryParams);
}

/** GET /reports/cancellations — cancelled bookings with reasons. */
export async function cancellations(params: ReportFilters): Promise<BookingReportDto[]> {
  return apiClient.get<BookingReportDto[]>('/reports/cancellations', params as unknown as QueryParams);
}

/** GET /reports/earnings-summary — owner earnings summary. */
export async function earningsSummary(): Promise<EarningsSummaryDto> {
  return apiClient.get<EarningsSummaryDto>('/reports/earnings-summary');
}
