import { apiClient } from '../lib/apiClient.js';
import type { AdminDashboardCountsDto, DailySummaryRow } from '../types/domain.js';
import type { DateRange } from '../lib/format.js';

export type { AdminDashboardCountsDto } from '../types/domain.js';

/** GET /bookings/dashboard — admin platform-wide stats (single API call). */
export async function getAdminDashboard(_range: DateRange): Promise<AdminDashboardCountsDto> {
  return apiClient.get<AdminDashboardCountsDto>('/bookings/dashboard');
}

/** GET /reports/daily-summary — booking value trend for charts. */
export async function getDailySummary(params: { dateFrom?: string; dateTo?: string }): Promise<DailySummaryRow[]> {
  return apiClient.get<DailySummaryRow[]>('/reports/daily-summary', params as Record<string, string | number | boolean | null | undefined>);
}
