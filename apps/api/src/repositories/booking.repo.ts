import type { DbClient, QueryableRow } from '../db/client.js';

export interface BookingRow {
  id: string;
  booking_reference: string;
  turf_id: string;
  turf_name: string;
  court_id: string;
  court_name: string;
  sport_id: string;
  sport_name: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  base_amount: number;
  discount_amount: number;
  total_amount: number;
  booking_source: 'PHONE' | 'IN_PERSON';
  booking_status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
  cancellation_reason: string | null;
  cancelled_at: Date | null;
  completed_at: Date | null;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

const SELECT = `
  select b.id, b.booking_reference, b.turf_id, t.name as turf_name, b.court_id, c.name as court_name,
         b.sport_id, s.name as sport_name, b.customer_name, b.customer_phone, b.booking_date,
         b.start_time, b.end_time, b.duration_minutes, b.base_amount, b.discount_amount,
         b.total_amount, b.booking_source, b.booking_status, b.cancellation_reason, b.cancelled_at,
         b.completed_at, b.created_by, b.created_at, b.updated_at
  from public.bookings b
  join public.turfs t on t.id = b.turf_id
  join public.courts c on c.id = b.court_id
  join public.master_items s on s.id = b.sport_id`;

const toDateStr = (v: unknown): string => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
};

const TIMES = (row: QueryableRow): BookingRow['start_time'] => String(row.start_time);

function toBooking(row: QueryableRow): BookingRow {
  return {
    id: String(row.id),
    booking_reference: String(row.booking_reference),
    turf_id: String(row.turf_id),
    turf_name: String(row.turf_name),
    court_id: String(row.court_id),
    court_name: String(row.court_name),
    sport_id: String(row.sport_id),
    sport_name: String(row.sport_name),
    customer_name: String(row.customer_name),
    customer_phone: String(row.customer_phone),
    booking_date: toDateStr(row.booking_date),
    start_time: TIMES(row),
    end_time: TIMES(row),
    duration_minutes: Number(row.duration_minutes),
    base_amount: Number(row.base_amount),
    discount_amount: Number(row.discount_amount),
    total_amount: Number(row.total_amount),
    booking_source: String(row.booking_source) as BookingRow['booking_source'],
    booking_status: String(row.booking_status) as BookingRow['booking_status'],
    cancellation_reason: row.cancellation_reason == null ? null : String(row.cancellation_reason),
    cancelled_at: row.cancelled_at == null ? null : new Date(String(row.cancelled_at)),
    completed_at: row.completed_at == null ? null : new Date(String(row.completed_at)),
    created_by: String(row.created_by),
    created_at: new Date(String(row.created_at)),
    updated_at: new Date(String(row.updated_at)),
  };
}

export function createBookingRepo(db: DbClient) {
  return {
    /** True when a CONFIRMED booking on the court overlaps the given slot. */
    async hasConfirmedOverlap(input: {
      courtId: string;
      bookingDate: string;
      startTime: string;
      endTime: string;
    }): Promise<boolean> {
      const { rows } = await db.query<QueryableRow>(
        `select 1 from public.bookings
         where court_id = $1::uuid
           and booking_date = $2::date
           and booking_status = 'CONFIRMED'
           and start_time < $4::time
           and end_time > $3::time
         limit 1`,
        [input.courtId, input.bookingDate, input.startTime, input.endTime],
      );
      return rows.length > 0;
    },

    async create(input: {
      bookingReference: string;
      turfId: string;
      courtId: string;
      sportId: string;
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
      createdBy: string;
    }): Promise<BookingRow> {
      const { rows } = await db.query<QueryableRow>(
        `insert into public.bookings
           (booking_reference, turf_id, court_id, sport_id, customer_name, customer_phone,
            booking_date, start_time, end_time, duration_minutes, base_amount, discount_amount,
            total_amount, booking_source, created_by)
         values ($1, $2, $3, $4, $5, $6, $7::date, $8::time, $9::time, $10, $11, $12, $13, $14, $15)
         returning id`,
        [
          input.bookingReference,
          input.turfId,
          input.courtId,
          input.sportId,
          input.customerName,
          input.customerPhone,
          input.bookingDate,
          input.startTime,
          input.endTime,
          input.durationMinutes,
          input.baseAmount,
          input.discountAmount,
          input.totalAmount,
          input.bookingSource,
          input.createdBy,
        ],
      );
      return (await this.findById(String(rows[0]!.id)))!;
    },

    /** Booking visible to an owner: the booking's turf must belong to them. */
    async findOwnedById(bookingId: string, ownerId: string): Promise<BookingRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `${SELECT} where b.id = $1::uuid and t.owner_id = $2::uuid`,
        [bookingId, ownerId],
      );
      return rows.length ? toBooking(rows[0]!) : null;
    },

    async findById(bookingId: string): Promise<BookingRow | null> {
      const { rows } = await db.query<QueryableRow>(`${SELECT} where b.id = $1::uuid`, [bookingId]);
      return rows.length ? toBooking(rows[0]!) : null;
    },

    /** Owner-scoped listing with pagination and filters (spec sections 14/31). */
    async listByOwner(
      ownerId: string,
      filters: {
        limit: number;
        offset: number;
        status?: BookingRow['booking_status'];
        courtId?: string;
        turfId?: string;
        dateFrom?: string;
        dateTo?: string;
        search?: string;
        orderBy: { column: string; order: 'asc' | 'desc' };
      },
    ): Promise<{ rows: BookingRow[]; total: number }> {
      const conditions = ['t.owner_id = $1::uuid'];
      const params: unknown[] = [ownerId];
      const cond = (sql: string, value: unknown) => {
        params.push(value);
        conditions.push(sql.replace('?', `$${params.length}`));
      };
      if (filters.status) cond('b.booking_status = ?', filters.status);
      if (filters.courtId) cond('b.court_id = ?::uuid', filters.courtId);
      if (filters.turfId) cond('b.turf_id = ?::uuid', filters.turfId);
      if (filters.dateFrom) cond('b.booking_date >= ?::date', filters.dateFrom);
      if (filters.dateTo) cond('b.booking_date <= ?::date', filters.dateTo);
      if (filters.search) {
        params.push(`%${filters.search}%`);
        conditions.push(`(b.customer_name ilike $${params.length} or b.customer_phone ilike $${params.length})`);
      }
      const where = `where ${conditions.join(' and ')}`;
      const { rows: countRows } = await db.query<QueryableRow>(
        `select count(*)::int as total ${SELECT.slice(SELECT.indexOf('from public.bookings'))} ${where}`,
        params,
      );
      const total = Number(countRows[0]?.total ?? 0);
      const orderColumn = ['booking_date', 'customer_name', 'booking_status', 'total_amount'].includes(
        filters.orderBy.column,
      )
        ? filters.orderBy.column
        : 'booking_date';
      params.push(filters.limit, filters.offset);
      const { rows } = await db.query<QueryableRow>(
        `${SELECT} ${where} order by ${orderColumn} ${filters.orderBy.order} limit $${params.length - 1} offset $${params.length}`,
        params,
      );
      return { rows: rows.map(toBooking), total };
    },

    /** Admin listing of all bookings. */
    async listAll(
      filters: {
        limit: number;
        offset: number;
        status?: BookingRow['booking_status'];
        courtId?: string;
        turfId?: string;
        dateFrom?: string;
        dateTo?: string;
        search?: string;
        orderBy: { column: string; order: 'asc' | 'desc' };
      },
    ): Promise<{ rows: BookingRow[]; total: number }> {
      const conditions: string[] = [];
      const params: unknown[] = [];
      const cond = (sql: string, value: unknown) => {
        params.push(value);
        conditions.push(sql.replace('?', `$${params.length}`));
      };
      if (filters.status) cond('b.booking_status = ?', filters.status);
      if (filters.courtId) cond('b.court_id = ?::uuid', filters.courtId);
      if (filters.turfId) cond('b.turf_id = ?::uuid', filters.turfId);
      if (filters.dateFrom) cond('b.booking_date >= ?::date', filters.dateFrom);
      if (filters.dateTo) cond('b.booking_date <= ?::date', filters.dateTo);
      if (filters.search) {
        params.push(`%${filters.search}%`);
        conditions.push(`(b.customer_name ilike $${params.length} or b.customer_phone ilike $${params.length})`);
      }
      const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
      const { rows: countRows } = await db.query<QueryableRow>(
        `select count(*)::int as total ${SELECT.slice(SELECT.indexOf('from public.bookings'))} ${where}`,
        params,
      );
      const total = Number(countRows[0]?.total ?? 0);
      const orderColumn = ['booking_date', 'customer_name', 'booking_status', 'total_amount'].includes(
        filters.orderBy.column,
      )
        ? filters.orderBy.column
        : 'booking_date';
      params.push(filters.limit, filters.offset);
      const { rows } = await db.query<QueryableRow>(
        `${SELECT} ${where} order by ${orderColumn} ${filters.orderBy.order} limit $${params.length - 1} offset $${params.length}`,
        params,
      );
      return { rows: rows.map(toBooking), total };
    },

    async cancel(bookingId: string, reason: string): Promise<BookingRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `update public.bookings
         set booking_status = 'CANCELLED', cancellation_reason = $2, cancelled_at = now()
         where id = $1::uuid
         returning id`,
        [bookingId, reason],
      );
      return rows.length ? this.findById(String(rows[0]!.id)) : null;
    },

    async complete(bookingId: string): Promise<BookingRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `update public.bookings
         set booking_status = 'COMPLETED', completed_at = now()
         where id = $1::uuid
         returning id`,
        [bookingId],
      );
      return rows.length ? this.findById(String(rows[0]!.id)) : null;
    },
  };
}

export type BookingRepo = ReturnType<typeof createBookingRepo>;
