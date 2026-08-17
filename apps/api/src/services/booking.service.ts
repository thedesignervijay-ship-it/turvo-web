import { randomBytes } from 'node:crypto';
import type { DbClient } from '../db/client.js';
import type { TurfRepo } from '../repositories/turf.repo.js';
import type { CourtRepo } from '../repositories/court.repo.js';
import type { BookingRepo, BookingRow } from '../repositories/booking.repo.js';
import { createBookingRepo } from '../repositories/booking.repo.js';
import type { OperatingHourRepo } from '../repositories/operatingHour.repo.js';
import type { AvailabilityRepo } from '../repositories/availability.repo.js';
import type { PricingRepo } from '../repositories/pricing.repo.js';
import type { NotificationRepo } from '../repositories/notification.repo.js';
import type { AuditService } from './audit.service.js';
import { bookingConflict, notFound, validationError } from '../lib/errors.js';
import {
  dayOfWeekOfDate,
  isPastSlot,
  isWeekend,
  kolkataLocalToUtc,
  minutesToTime,
  timeToMinutes,
} from '../lib/time.js';

export interface Actor {
  id: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface CreateBookingInput {
  courtId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  bookingSource: 'PHONE' | 'IN_PERSON';
  discountAmount: number;
}

export interface BookingListQuery {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  sortOrder: 'asc' | 'desc';
  status?: BookingRow['booking_status'];
  courtId?: string;
  turfId?: string;
  dateFrom?: string;
  dateTo?: string;
}

const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateReference(): string {
  let ref = '';
  for (let i = 0; i < 8; i++) {
    ref += REFERENCE_ALPHABET[randomBytes(1)[0]! % REFERENCE_ALPHABET.length];
  }
  return `BK-${ref}`;
}

export function createBookingService(deps: {
  db: DbClient;
  turfRepo: TurfRepo;
  courtRepo: CourtRepo;
  bookingRepo: BookingRepo;
  operatingHourRepo: OperatingHourRepo;
  availabilityRepo: AvailabilityRepo;
  pricingRepo: PricingRepo;
  notificationRepo: NotificationRepo;
  audit: AuditService;
}) {
  const validateWindow = async (
    turf: { id: string; slot_duration_minutes: number },
    court: { id: string; sport_id: string },
    input: CreateBookingInput,
  ) => {
    const startMin = timeToMinutes(input.startTime);
    const endMin = timeToMinutes(input.endTime);
    const duration = endMin - startMin;

    if (isPastSlot(input.bookingDate, input.startTime)) {
      throw validationError('A booking cannot start in the past.');
    }

    const hour = (await deps.operatingHourRepo.listByTurf(turf.id)).find(
      (h) => h.day_of_week === dayOfWeekOfDate(input.bookingDate),
    );
    if (!hour || hour.is_closed) {
      throw validationError('The turf is closed on this day.');
    }
    const openingMin = timeToMinutes(hour.opening_time);
    const closingMin = timeToMinutes(hour.closing_time);
    if (startMin < openingMin || endMin > closingMin) {
      throw validationError('The requested time falls outside the operating hours.');
    }

    const slotStartUtc = kolkataLocalToUtc(input.bookingDate, input.startTime);
    const slotEndUtc = kolkataLocalToUtc(input.bookingDate, input.endTime);
    const blocks = await deps.availabilityRepo.overlapping(turf.id, slotStartUtc, slotEndUtc);
    if (
      blocks.some(
        (b) => (b.court_id === null || b.court_id === court.id) && b.start_datetime < slotEndUtc && b.end_datetime > slotStartUtc,
      )
    ) {
      throw validationError('The slot is blocked and cannot be booked.');
    }

    if (
      await deps.bookingRepo.hasConfirmedOverlap({
        courtId: court.id,
        bookingDate: input.bookingDate,
        startTime: input.startTime,
        endTime: input.endTime,
      })
    ) {
      throw bookingConflict();
    }

    let baseAmount = 0;
    const dayType = isWeekend(input.bookingDate) ? 'WEEKEND' : 'WEEKDAY';
    for (let start = startMin; start + turf.slot_duration_minutes <= endMin; start += turf.slot_duration_minutes) {
      const rule = await deps.pricingRepo.findActiveForSlot({
        turfId: turf.id,
        courtId: court.id,
        date: input.bookingDate,
        startTime: minutesToTime(start),
        endTime: minutesToTime(Math.min(start + turf.slot_duration_minutes, endMin)),
        dayType,
      });
      if (!rule) {
        throw validationError('No pricing rule covers the requested time.');
      }
      baseAmount += rule.price;
    }

    const discountAmount = Math.round(input.discountAmount * 100) / 100;
    if (discountAmount > baseAmount) {
      throw validationError('Discount cannot exceed the base amount.');
    }
    const totalAmount = Math.round((baseAmount - discountAmount) * 100) / 100;

    return { durationMinutes: Math.round(duration), baseAmount, discountAmount, totalAmount };
  };

  return {
    async create(ownerId: string, input: CreateBookingInput, actor: Actor): Promise<BookingRow> {
      const court = await deps.courtRepo.findOwnedById(input.courtId, ownerId);
      if (!court) throw notFound('Court not found.');
      const turf = await deps.turfRepo.findOwnedBy(court.turf_id, ownerId);
      if (!turf) throw notFound('Turf not found.');
      if (turf.approval_status !== 'APPROVED' || turf.status !== 'ACTIVE') {
        throw validationError('The turf is not approved and active.');
      }
      if (court.status !== 'ACTIVE') {
        throw validationError('The court is not active.');
      }

      const { durationMinutes, baseAmount, discountAmount, totalAmount } = await validateWindow(turf, court, input);

      const booking = await deps.db.transaction(async (tx) => {
        for (let attempt = 0; attempt < 5; attempt++) {
          const bookingRepo = createBookingRepo(tx);
          try {
            return await bookingRepo.create({
              bookingReference: generateReference(),
              turfId: turf.id,
              courtId: court.id,
              sportId: court.sport_id,
              customerName: input.customerName,
              customerPhone: input.customerPhone,
              bookingDate: input.bookingDate,
              startTime: input.startTime,
              endTime: input.endTime,
              durationMinutes,
              baseAmount,
              discountAmount,
              totalAmount,
              bookingSource: input.bookingSource,
              createdBy: actor.id,
            });
          } catch (err) {
            if ((err as { code?: unknown }).code === '23505' && attempt < 4) continue;
            throw err;
          }
        }
        throw new Error('Could not generate a unique booking reference.');
      });

      await deps.notificationRepo.create({
        userId: actor.id,
        type: 'NEW_BOOKING',
        title: 'New booking',
        message: `Booking ${booking.booking_reference} created for ${booking.customer_name} on ${booking.booking_date}.`,
        entityType: 'bookings',
        entityId: booking.id,
      });
      await deps.audit.log({
        actor,
        action: 'BOOKING_CREATE',
        entityType: 'bookings',
        entityId: booking.id,
        oldValue: null,
        newValue: { ...input, turfId: turf.id },
      });
      return booking;
    },

    async list(requester: { id: string; role: 'OWNER' | 'ADMIN' }, ownerId: string | null, query: BookingListQuery) {
      const filters = {
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        status: query.status,
        courtId: query.courtId,
        turfId: query.turfId,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        search: query.search,
        orderBy: { column: query.sort ?? 'booking_date', order: query.sortOrder },
      };
      if (requester.role === 'ADMIN') {
        const { rows, total } = await deps.bookingRepo.listAll(filters);
        return { rows, total, page: query.page, limit: query.limit };
      }
      const { rows, total } = await deps.bookingRepo.listByOwner(ownerId!, filters);
      return { rows, total, page: query.page, limit: query.limit };
    },

    async get(requester: { role: 'OWNER' | 'ADMIN' }, ownerId: string | null, bookingId: string): Promise<BookingRow> {
      const booking =
        requester.role === 'ADMIN'
          ? await deps.bookingRepo.findById(bookingId)
          : await deps.bookingRepo.findOwnedById(bookingId, ownerId!);
      if (!booking) throw notFound('Booking not found.');
      return booking;
    },

    async cancel(ownerId: string, bookingId: string, reason: string, actor: Actor): Promise<BookingRow> {
      const booking = await deps.bookingRepo.findOwnedById(bookingId, ownerId);
      if (!booking) throw notFound('Booking not found.');
      if (booking.booking_status !== 'CONFIRMED') {
        throw validationError('Only a confirmed booking can be cancelled.');
      }
      const updated = await deps.bookingRepo.cancel(bookingId, reason);
      if (!updated) throw notFound('Booking not found.');
      await deps.notificationRepo.create({
        userId: actor.id,
        type: 'BOOKING_CANCELLED',
        title: 'Booking cancelled',
        message: `Booking ${updated.booking_reference} for ${updated.customer_name} was cancelled.`,
        entityType: 'bookings',
        entityId: bookingId,
      });
      await deps.audit.log({
        actor,
        action: 'BOOKING_CANCEL',
        entityType: 'bookings',
        entityId: bookingId,
        oldValue: { status: booking.booking_status },
        newValue: { status: 'CANCELLED', reason },
      });
      return updated;
    },

    async complete(ownerId: string, bookingId: string, actor: Actor): Promise<BookingRow> {
      const booking = await deps.bookingRepo.findOwnedById(bookingId, ownerId);
      if (!booking) throw notFound('Booking not found.');
      if (booking.booking_status !== 'CONFIRMED') {
        throw validationError('Only a confirmed booking can be completed.');
      }
      const updated = await deps.bookingRepo.complete(bookingId);
      if (!updated) throw notFound('Booking not found.');
      await deps.audit.log({
        actor,
        action: 'BOOKING_COMPLETE',
        entityType: 'bookings',
        entityId: bookingId,
        oldValue: { status: booking.booking_status },
        newValue: { status: 'COMPLETED' },
      });
      return updated;
    },

    /** Counts for the owner dashboard (spec section 21). */
    async dashboardCounts(ownerId: string) {
      const { rows } = await deps.db.query<{ today: number; month: number; completed: number; cancelled: number }>(
        `select
           count(*) filter (where booking_date = current_date)::int as today,
           count(*) filter (where booking_date >= date_trunc('month', current_date)::date)::int as month,
           count(*) filter (where booking_status = 'COMPLETED')::int as completed,
           count(*) filter (where booking_status = 'CANCELLED')::int as cancelled
         from public.bookings b
         join public.turfs t on t.id = b.turf_id
         where t.owner_id = $1::uuid`,
        [ownerId],
      );
      const r = rows[0]!;
      return { today: Number(r.today), month: Number(r.month), completed: Number(r.completed), cancelled: Number(r.cancelled) };
    },

    /** Platform-wide dashboard stats for admin users. */
    async adminDashboardCounts() {
      const { rows } = await deps.db.query<{
        total_turf_owners: number;
        active_turf_owners: number;
        total_turfs: number;
        active_turfs: number;
        pending_turfs: number;
        total_bookings: number;
        today_bookings: number;
        month_bookings: number;
        completed_bookings: number;
        cancelled_bookings: number;
        total_revenue: number;
        month_revenue: number;
      }>(
        `select
           (select count(*) from public.turf_owners)::int as total_turf_owners,
           (select count(*) from public.turf_owners where status = 'ACTIVE')::int as active_turf_owners,
           (select count(*) from public.turfs)::int as total_turfs,
           (select count(*) from public.turfs where status = 'ACTIVE')::int as active_turfs,
           (select count(*) from public.turfs where approval_status in ('SUBMITTED','UNDER_REVIEW'))::int as pending_turfs,
           (select count(*) from public.bookings)::int as total_bookings,
           (select count(*) from public.bookings where booking_date = current_date)::int as today_bookings,
           (select count(*) from public.bookings where booking_date >= date_trunc('month', current_date)::date)::int as month_bookings,
           (select count(*) from public.bookings where booking_status = 'COMPLETED')::int as completed_bookings,
           (select count(*) from public.bookings where booking_status = 'CANCELLED')::int as cancelled_bookings,
           (select coalesce(sum(total_amount), 0) from public.bookings where booking_status != 'CANCELLED')::numeric as total_revenue,
           (select coalesce(sum(total_amount), 0) from public.bookings where booking_status != 'CANCELLED' and booking_date >= date_trunc('month', current_date)::date)::numeric as month_revenue`,
      );
      const r = rows[0]!;
      return {
        totalTurfOwners: Number(r.total_turf_owners),
        activeTurfOwners: Number(r.active_turf_owners),
        totalTurfs: Number(r.total_turfs),
        activeTurfs: Number(r.active_turfs),
        pendingTurfs: Number(r.pending_turfs),
        totalBookings: Number(r.total_bookings),
        todayBookings: Number(r.today_bookings),
        monthBookings: Number(r.month_bookings),
        completedBookings: Number(r.completed_bookings),
        cancelledBookings: Number(r.cancelled_bookings),
        totalRevenue: Number(r.total_revenue),
        monthRevenue: Number(r.month_revenue),
      };
    },
  };
}

export type BookingService = ReturnType<typeof createBookingService>;
