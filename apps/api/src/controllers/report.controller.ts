import type { Request, Response } from 'express';
import { sendSuccess } from '../lib/http.js';
import { forbidden } from '../lib/errors.js';
import type { ReportService, ReportFilters } from '../services/report.service.js';
import { serializeBookingReport, bookingReportToCsv } from '../serializers/report.js';

function requester(req: Request): { role: 'OWNER' | 'ADMIN'; ownerId: string | null } {
  const user = req.auth!.user;
  const ownerId = req.auth!.owner?.id ?? null;
  if (user.role === 'OWNER' && !ownerId) throw forbidden('Owner profile not found.');
  return { role: user.role, ownerId };
}

function filtersFrom(req: Request): ReportFilters {
  const q = req.validated!.query as Record<string, unknown>;
  const filters: ReportFilters = {
    dateFrom: q.dateFrom as string | undefined,
    dateTo: q.dateTo as string | undefined,
    turfId: q.turfId as string | undefined,
    courtId: q.courtId as string | undefined,
    sportId: q.sportId as string | undefined,
    status: q.status as ReportFilters['status'],
    bookingSource: q.bookingSource as ReportFilters['bookingSource'],
    search: q.search as string | undefined,
  };
  if (typeof q.ownerId === 'string') filters.ownerId = q.ownerId;
  return filters;
}

function paginationFrom(req: Request) {
  const q = req.validated!.query as Record<string, unknown>;
  return {
    page: Number(q.page ?? 1),
    limit: Number(q.limit ?? 20),
    sort: (q.sort as string) ?? 'booking_date',
    sortOrder: (q.sortOrder as 'asc' | 'desc') ?? 'desc',
  };
}

export function createReportController(reportService: ReportService) {
  return {
    bookingReport: async (req: Request, res: Response): Promise<void> => {
      const { role, ownerId } = requester(req);
      const filters = filtersFrom(req);
      const result = await reportService.bookingReport(
        { role },
        ownerId,
        filters,
        paginationFrom(req),
      );
      sendSuccess(res, { ...result, rows: result.rows.map(serializeBookingReport) });
    },

    bookingReportCsv: async (req: Request, res: Response): Promise<void> => {
      const { role, ownerId } = requester(req);
      const filters = filtersFrom(req);
      const rows = await reportService.bookingReportAll({ role }, ownerId, filters);
      const csv = bookingReportToCsv(rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="booking-report.csv"');
      res.status(200).send(csv);
    },

    earningsSummary: async (req: Request, res: Response): Promise<void> => {
      const { ownerId } = requester(req);
      const summary = await reportService.earningsSummary(ownerId!);
      sendSuccess(res, summary);
    },

    dailySummary: async (req: Request, res: Response): Promise<void> => {
      const { role, ownerId } = requester(req);
      const result = await reportService.dailySummary({ role }, ownerId, filtersFrom(req));
      sendSuccess(res, result);
    },

    cancellations: async (req: Request, res: Response): Promise<void> => {
      const { role, ownerId } = requester(req);
      const result = await reportService.cancellations({ role }, ownerId, filtersFrom(req));
      sendSuccess(res, result.map(serializeBookingReport));
    },

    ownerReport: async (req: Request, res: Response): Promise<void> => {
      const { role } = requester(req);
      if (role !== 'ADMIN') throw forbidden('Only admins can view the owner report.');
      const q = req.validated!.query as { dateFrom?: string; dateTo?: string };
      const result = await reportService.ownerReport({ dateFrom: q.dateFrom, dateTo: q.dateTo });
      sendSuccess(res, result);
    },

    turfReport: async (req: Request, res: Response): Promise<void> => {
      const { role } = requester(req);
      if (role !== 'ADMIN') throw forbidden('Only admins can view the turf report.');
      const q = req.validated!.query as { dateFrom?: string; dateTo?: string };
      const result = await reportService.turfReport({ dateFrom: q.dateFrom, dateTo: q.dateTo });
      sendSuccess(res, result);
    },
  };
}
