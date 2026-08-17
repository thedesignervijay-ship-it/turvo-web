import type { ReportRepo, BookingReportFilters } from '../repositories/report.repo.js';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  turfId?: string;
  courtId?: string;
  sportId?: string;
  status?: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  bookingSource?: 'PHONE' | 'IN_PERSON';
  search?: string;
  ownerId?: string;
}

export function createReportService(reportRepo: ReportRepo) {
  /** Owner-scoped report filters (spec section 23: owner reports are owner-scoped). */
  const ownerFilters = (ownerId: string, filters: ReportFilters): BookingReportFilters => ({
    ...filters,
    ownerId,
  });

  return {
    /** Booking report. Admins see all owners, owners see only their turf. */
    async bookingReport(
      requester: { role: 'OWNER' | 'ADMIN' },
      ownerId: string | null,
      filters: ReportFilters,
      pagination: { page: number; limit: number; sort: string; sortOrder: 'asc' | 'desc' },
    ) {
      const base: BookingReportFilters =
        requester.role === 'ADMIN' ? { ...filters } : ownerFilters(ownerId!, filters);
      const { rows, total } = await reportRepo.bookingReport({
        ...base,
        limit: pagination.limit,
        offset: (pagination.page - 1) * pagination.limit,
        orderBy: { column: pagination.sort ?? 'booking_date', order: pagination.sortOrder },
      });
      return { rows, total, page: pagination.page, limit: pagination.limit };
    },

    /** All matching rows for CSV export. */
    async bookingReportAll(
      requester: { role: 'OWNER' | 'ADMIN' },
      ownerId: string | null,
      filters: ReportFilters,
    ) {
      const base: BookingReportFilters =
        requester.role === 'ADMIN' ? { ...filters } : ownerFilters(ownerId!, filters);
      return reportRepo.bookingReportAll({
        ...base,
        orderBy: { column: 'booking_date', order: 'asc' },
      });
    },

    async earningsSummary(ownerId: string) {
      return reportRepo.earningsSummary(ownerId);
    },

    async dailySummary(
      requester: { role: 'OWNER' | 'ADMIN' },
      ownerId: string | null,
      filters: ReportFilters,
    ) {
      const base: BookingReportFilters =
        requester.role === 'ADMIN' ? { ...filters } : ownerFilters(ownerId!, filters);
      return reportRepo.dailySummary(base);
    },

    async cancellations(
      requester: { role: 'OWNER' | 'ADMIN' },
      ownerId: string | null,
      filters: ReportFilters,
    ) {
      const base: BookingReportFilters =
        requester.role === 'ADMIN' ? { ...filters } : ownerFilters(ownerId!, filters);
      return reportRepo.cancellations(base);
    },

    async ownerReport(filters: { dateFrom?: string; dateTo?: string }) {
      return reportRepo.ownerReport(filters);
    },

    async turfReport(filters: { dateFrom?: string; dateTo?: string }) {
      return reportRepo.turfReport(filters);
    },
  };
}

export type ReportService = ReturnType<typeof createReportService>;
