import type { DbClient, QueryableRow } from '../db/client.js';

export interface BookingReportFilters {
  ownerId?: string;
  turfId?: string;
  courtId?: string;
  sportId?: string;
  status?: string;
  bookingSource?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface BookingReportRow {
  id: string;
  booking_reference: string;
  turf_id: string;
  turf_name: string;
  court_id: string;
  court_name: string;
  sport_id: string;
  sport_name: string;
  owner_id: string;
  owner_name: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  base_amount: number;
  discount_amount: number;
  total_amount: number;
  booking_source: string;
  booking_status: string;
  cancellation_reason: string | null;
  cancelled_at: Date | null;
  completed_at: Date | null;
  created_at: Date;
}

const BOOKING_SELECT = `
  select b.id, b.booking_reference, b.turf_id, t.name as turf_name, b.court_id, c.name as court_name,
         b.sport_id, s.name as sport_name, t.owner_id, u.name as owner_name,
         b.customer_name, b.customer_phone, b.booking_date, b.start_time, b.end_time, b.duration_minutes,
         b.base_amount, b.discount_amount, b.total_amount, b.booking_source, b.booking_status,
         b.cancellation_reason, b.cancelled_at, b.completed_at, b.created_at
  from public.bookings b
  join public.turfs t on t.id = b.turf_id
  join public.courts c on c.id = b.court_id
  join public.master_items s on s.id = b.sport_id
  join public.turf_owners o on o.id = t.owner_id
  join public.users u on u.id = o.user_id`;

function buildWhere(filters: BookingReportFilters): { where: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];
  const cond = (sql: string, value: unknown) => {
    params.push(value);
    conditions.push(sql.replace('?', `$${params.length}`));
  };
  if (filters.ownerId) cond('t.owner_id = ?::uuid', filters.ownerId);
  if (filters.turfId) cond('b.turf_id = ?::uuid', filters.turfId);
  if (filters.courtId) cond('b.court_id = ?::uuid', filters.courtId);
  if (filters.sportId) cond('b.sport_id = ?::uuid', filters.sportId);
  if (filters.status) cond('b.booking_status = ?', filters.status);
  if (filters.bookingSource) cond('b.booking_source = ?', filters.bookingSource);
  if (filters.dateFrom) cond('b.booking_date >= ?::date', filters.dateFrom);
  if (filters.dateTo) cond('b.booking_date <= ?::date', filters.dateTo);
  if (filters.search) {
    params.push(`%${filters.search}%`);
    conditions.push(`(b.customer_name ilike $${params.length} or b.customer_phone ilike $${params.length} or b.booking_reference ilike $${params.length})`);
  }
  const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
  return { where, params };
}

const toDateStr = (v: unknown): string => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
};

function toReportRow(row: QueryableRow): BookingReportRow {
  return {
    id: String(row.id),
    booking_reference: String(row.booking_reference),
    turf_id: String(row.turf_id),
    turf_name: String(row.turf_name),
    court_id: String(row.court_id),
    court_name: String(row.court_name),
    sport_id: String(row.sport_id),
    sport_name: String(row.sport_name),
    owner_id: String(row.owner_id),
    owner_name: String(row.owner_name),
    customer_name: String(row.customer_name),
    customer_phone: String(row.customer_phone),
    booking_date: toDateStr(row.booking_date),
    start_time: String(row.start_time),
    end_time: String(row.end_time),
    duration_minutes: Number(row.duration_minutes),
    base_amount: Number(row.base_amount),
    discount_amount: Number(row.discount_amount),
    total_amount: Number(row.total_amount),
    booking_source: String(row.booking_source),
    booking_status: String(row.booking_status),
    cancellation_reason: row.cancellation_reason == null ? null : String(row.cancellation_reason),
    cancelled_at: row.cancelled_at == null ? null : new Date(String(row.cancelled_at)),
    completed_at: row.completed_at == null ? null : new Date(String(row.completed_at)),
    created_at: new Date(String(row.created_at)),
  };
}

export function createReportRepo(db: DbClient) {
  return {
    /** Booking rows matching the filters (used for reports and CSV export). */
    async bookingReport(
      filters: BookingReportFilters & { limit: number; offset: number; orderBy: { column: string; order: 'asc' | 'desc' } },
    ): Promise<{ rows: BookingReportRow[]; total: number }> {
      const { where, params } = buildWhere(filters);
      const { rows: countRows } = await db.query<QueryableRow>(
        `select count(*)::int as total from public.bookings b
         join public.turfs t on t.id = b.turf_id ${where}`,
        params,
      );
      const total = Number(countRows[0]?.total ?? 0);
      const orderColumn = ['booking_date', 'customer_name', 'booking_status', 'total_amount', 'created_at'].includes(
        filters.orderBy.column,
      )
        ? filters.orderBy.column
        : 'booking_date';
      params.push(filters.limit, filters.offset);
      const { rows } = await db.query<QueryableRow>(
        `${BOOKING_SELECT} ${where} order by ${orderColumn} ${filters.orderBy.order} limit $${params.length - 1} offset $${params.length}`,
        params,
      );
      return { rows: rows.map(toReportRow), total };
    },

    /** All rows matching the filters without pagination (CSV export). */
    async bookingReportAll(
      filters: BookingReportFilters & { orderBy: { column: string; order: 'asc' | 'desc' } },
    ): Promise<BookingReportRow[]> {
      const { where, params } = buildWhere(filters);
      const orderColumn = filters.orderBy.column;
      const { rows } = await db.query<QueryableRow>(
        `${BOOKING_SELECT} ${where} order by ${orderColumn} ${filters.orderBy.order}`,
        params,
      );
      return rows.map(toReportRow);
    },

    /** Owner earnings summary (spec section 19). */
    async earningsSummary(ownerId: string): Promise<{
      todayValue: number;
      todayCount: number;
      monthValue: number;
      monthCount: number;
      completedValue: number;
      completedCount: number;
      cancelledValue: number;
      cancelledCount: number;
    }> {
      const { rows } = await db.query<QueryableRow>(
        `select
           coalesce(sum(total_amount) filter (where booking_date = current_date and booking_status <> 'CANCELLED'), 0)::float as today_value,
           count(*) filter (where booking_date = current_date and booking_status <> 'CANCELLED')::int as today_count,
           coalesce(sum(total_amount) filter (where booking_date >= date_trunc('month', current_date)::date and booking_status <> 'CANCELLED'), 0)::float as month_value,
           count(*) filter (where booking_date >= date_trunc('month', current_date)::date and booking_status <> 'CANCELLED')::int as month_count,
           coalesce(sum(total_amount) filter (where booking_status = 'COMPLETED'), 0)::float as completed_value,
           count(*) filter (where booking_status = 'COMPLETED')::int as completed_count,
           coalesce(sum(total_amount) filter (where booking_status = 'CANCELLED'), 0)::float as cancelled_value,
           count(*) filter (where booking_status = 'CANCELLED')::int as cancelled_count
         from public.bookings b
         join public.turfs t on t.id = b.turf_id
         where t.owner_id = $1::uuid`,
        [ownerId],
      );
      const r = rows[0]!;
      return {
        todayValue: Number(r.today_value),
        todayCount: Number(r.today_count),
        monthValue: Number(r.month_value),
        monthCount: Number(r.month_count),
        completedValue: Number(r.completed_value),
        completedCount: Number(r.completed_count),
        cancelledValue: Number(r.cancelled_value),
        cancelledCount: Number(r.cancelled_count),
      };
    },

    /** Booking value grouped by day (Kolkata booking_date), excluding cancellations. */
    async dailySummary(
      filters: BookingReportFilters,
    ): Promise<{ date: string; count: number; value: number }[]> {
      const { where, params } = buildWhere(filters);
      const fullWhere = where === '' ? `where b.booking_status <> 'CANCELLED'` : `${where} and b.booking_status <> 'CANCELLED'`;
      const { rows } = await db.query<QueryableRow>(
        `select booking_date, count(*)::int as count, coalesce(sum(total_amount), 0)::float as value
         from public.bookings b
         join public.turfs t on t.id = b.turf_id
         ${fullWhere}
         group by booking_date
         order by booking_date asc`,
        params,
      );
      return rows.map((r) => ({ date: toDateStr(r.booking_date), count: Number(r.count), value: Number(r.value) }));
    },

    /** Cancelled bookings with reasons within the filters. */
    async cancellations(
      filters: BookingReportFilters,
    ): Promise<BookingReportRow[]> {
      const { where, params } = buildWhere(filters);
      const fullWhere = where === '' ? `where b.booking_status = 'CANCELLED'` : `${where} and b.booking_status = 'CANCELLED'`;
      const { rows } = await db.query<QueryableRow>(
        `${BOOKING_SELECT} ${fullWhere} order by b.cancelled_at desc`,
        params,
      );
      return rows.map(toReportRow);
    },

    /** Per-owner booking report for admins. */
    async ownerReport(filters: { dateFrom?: string; dateTo?: string }) {
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (filters.dateFrom) {
        params.push(filters.dateFrom);
        conditions.push(`b.booking_date >= $${params.length}::date`);
      }
      if (filters.dateTo) {
        params.push(filters.dateTo);
        conditions.push(`b.booking_date <= $${params.length}::date`);
      }
      const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
      const { rows } = await db.query<QueryableRow>(
        `select o.id as owner_id, o.business_name, u.name as owner_name, u.email,
                count(b.id)::int as bookings,
                count(b.id) filter (where b.booking_status = 'COMPLETED')::int as completed,
                count(b.id) filter (where b.booking_status = 'CANCELLED')::int as cancelled,
                coalesce(sum(b.total_amount) filter (where b.booking_status <> 'CANCELLED'), 0)::float as booking_value,
                count(distinct t.id)::int as turfs
         from public.turf_owners o
         join public.users u on u.id = o.user_id
         left join public.turfs t on t.owner_id = o.id
         left join public.bookings b on b.turf_id = t.id
         ${where}
         group by o.id, o.business_name, u.name, u.email
         order by o.business_name`,
        params,
      );
      return rows.map((r) => ({
        ownerId: String(r.owner_id),
        businessName: String(r.business_name),
        ownerName: String(r.owner_name),
        email: String(r.email),
        turfs: Number(r.turfs),
        bookings: Number(r.bookings),
        completed: Number(r.completed),
        cancelled: Number(r.cancelled),
        bookingValue: Number(r.booking_value),
      }));
    },

    /** Per-turf booking report for admins. */
    async turfReport(filters: { dateFrom?: string; dateTo?: string }) {
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (filters.dateFrom) {
        params.push(filters.dateFrom);
        conditions.push(`b.booking_date >= $${params.length}::date`);
      }
      if (filters.dateTo) {
        params.push(filters.dateTo);
        conditions.push(`b.booking_date <= $${params.length}::date`);
      }
      const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
      const { rows } = await db.query<QueryableRow>(
        `select t.id as turf_id, t.name as turf_name, o.business_name, t.city, t.status, t.approval_status,
                count(b.id)::int as bookings,
                count(b.id) filter (where b.booking_status = 'COMPLETED')::int as completed,
                count(b.id) filter (where b.booking_status = 'CANCELLED')::int as cancelled,
                coalesce(sum(b.total_amount) filter (where b.booking_status <> 'CANCELLED'), 0)::float as booking_value
         from public.turfs t
         join public.turf_owners o on o.id = t.owner_id
         left join public.bookings b on b.turf_id = t.id
         ${where}
         group by t.id, t.name, o.business_name, t.city, t.status, t.approval_status
         order by t.name`,
        params,
      );
      return rows.map((r) => ({
        turfId: String(r.turf_id),
        turfName: String(r.turf_name),
        businessName: String(r.business_name),
        city: String(r.city),
        status: String(r.status),
        approvalStatus: String(r.approval_status),
        bookings: Number(r.bookings),
        completed: Number(r.completed),
        cancelled: Number(r.cancelled),
        bookingValue: Number(r.booking_value),
      }));
    },
  };
}

export type ReportRepo = ReturnType<typeof createReportRepo>;
