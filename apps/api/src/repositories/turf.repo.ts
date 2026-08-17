import type { DbClient, QueryableRow } from '../db/client.js';
import type { TurfApprovalStatus, TurfStatus } from '@turvo/shared';

export interface TurfRow {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude: string | null;
  longitude: string | null;
  contact_phone: string;
  contact_email: string | null;
  slot_duration_minutes: number;
  status: TurfStatus;
  approval_status: TurfApprovalStatus;
  rejection_reason: string | null;
  submitted_at: Date | null;
  approved_at: Date | null;
  rejected_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface TurfDetailRow extends TurfRow {
  owner_name: string;
  owner_business_name: string;
  owner_user_id: string;
  owner_status: TurfStatus;
  court_count: number;
  sport_ids: string[];
}

export interface CreateTurfInput {
  ownerId: string;
  name: string;
  description: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude?: number | null;
  longitude?: number | null;
  contactPhone: string;
  contactEmail?: string | null;
  slotDurationMinutes?: number;
  sportIds: string[];
}

export interface UpdateTurfInput {
  name?: string;
  description?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number | null;
  longitude?: number | null;
  contactPhone?: string;
  contactEmail?: string | null;
  slotDurationMinutes?: 30 | 60;
}

export interface TurfListFilters {
  search?: string;
  status?: TurfStatus;
  approvalStatus?: TurfApprovalStatus;
  city?: string;
  ownerId?: string;
  limit: number;
  offset: number;
  orderBy: { column: string; order: 'asc' | 'desc' };
}

const TURF_SELECT = `
  select t.id, t.owner_id, t.name, t.description, t.address_line_1, t.address_line_2,
         t.city, t.state, t.pincode, t.latitude, t.longitude, t.contact_phone,
         t.contact_email, t.slot_duration_minutes, t.status, t.approval_status,
         t.rejection_reason, t.submitted_at, t.approved_at, t.rejected_at,
         t.created_at, t.updated_at,
         u.name as owner_name, o.business_name as owner_business_name, u.id as owner_user_id, o.status as owner_status,
         (select count(*)::int from public.courts c where c.turf_id = t.id) as court_count,
         coalesce((select array_agg(ts.sport_id::text) from public.turf_sports ts where ts.turf_id = t.id), array[]::text[]) as sport_ids
  from public.turfs t
  join public.turf_owners o on o.id = t.owner_id
  join public.users u on u.id = o.user_id`;

function toTurfDetail(row: QueryableRow): TurfDetailRow {
  return row as unknown as TurfDetailRow;
}

export function createTurfRepo(db: DbClient) {
  return {
    async findById(id: string): Promise<TurfDetailRow | null> {
      const { rows } = await db.query<QueryableRow>(`${TURF_SELECT} where t.id = $1`, [id]);
      return rows.length ? toTurfDetail(rows[0]!) : null;
    },

    async findOwnedBy(id: string, ownerId: string): Promise<TurfDetailRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `${TURF_SELECT} where t.id = $1 and t.owner_id = $2`,
        [id, ownerId],
      );
      return rows.length ? toTurfDetail(rows[0]!) : null;
    },

    async create(input: CreateTurfInput): Promise<TurfRow> {
      const { rows } = await db.query<QueryableRow>(
        `insert into public.turfs
           (owner_id, name, description, address_line_1, address_line_2, city, state,
            pincode, latitude, longitude, contact_phone, contact_email, slot_duration_minutes)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         returning id, owner_id, name, description, address_line_1, address_line_2,
                   city, state, pincode, latitude, longitude, contact_phone, contact_email,
                   slot_duration_minutes, status, approval_status, rejection_reason,
                   submitted_at, approved_at, rejected_at, created_at, updated_at`,
        [
          input.ownerId,
          input.name,
          input.description,
          input.addressLine1,
          input.addressLine2 ?? null,
          input.city,
          input.state,
          input.pincode,
          input.latitude ?? null,
          input.longitude ?? null,
          input.contactPhone,
          input.contactEmail ?? null,
          input.slotDurationMinutes ?? 60,
        ],
      );
      return rows[0] as unknown as TurfRow;
    },

    async update(id: string, input: UpdateTurfInput): Promise<TurfRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `update public.turfs
         set name = coalesce($2, name),
             description = coalesce($3, description),
             address_line_1 = coalesce($4, address_line_1),
             address_line_2 = coalesce($5, address_line_2),
             city = coalesce($6, city),
             state = coalesce($7, state),
             pincode = coalesce($8, pincode),
             latitude = coalesce($9, latitude),
             longitude = coalesce($10, longitude),
             contact_phone = coalesce($11, contact_phone),
             contact_email = coalesce($12, contact_email),
             slot_duration_minutes = coalesce($13, slot_duration_minutes)
         where id = $1
         returning id, owner_id, name, description, address_line_1, address_line_2,
                   city, state, pincode, latitude, longitude, contact_phone, contact_email,
                   slot_duration_minutes, status, approval_status, rejection_reason,
                   submitted_at, approved_at, rejected_at, created_at, updated_at`,
        [
          id,
          input.name ?? null,
          input.description ?? null,
          input.addressLine1 ?? null,
          input.addressLine2 === undefined ? null : input.addressLine2,
          input.city ?? null,
          input.state ?? null,
          input.pincode ?? null,
          input.latitude === undefined ? null : input.latitude,
          input.longitude === undefined ? null : input.longitude,
          input.contactPhone ?? null,
          input.contactEmail === undefined ? null : input.contactEmail,
          input.slotDurationMinutes ?? null,
        ],
      );
      return rows.length ? (rows[0] as unknown as TurfRow) : null;
    },

    async setApprovalStatus(
      id: string,
      status: TurfApprovalStatus,
      opts: { rejectionReason?: string | null; submittedAt?: boolean; approvedAt?: boolean; rejectedAt?: boolean } = {},
    ): Promise<TurfRow | null> {
      const parts: string[] = ['approval_status = $2'];
      const params: unknown[] = [id, status];
      const timestamps: Record<string, boolean> = {
        submitted_at: opts.submittedAt ?? false,
        approved_at: opts.approvedAt ?? false,
        rejected_at: opts.rejectedAt ?? false,
      };
      if (opts.rejectionReason !== undefined) {
        params.push(opts.rejectionReason);
        parts.push(`rejection_reason = $${params.length}`);
      }
      for (const [col, apply] of Object.entries(timestamps)) {
        if (apply) {
          parts.push(`${col} = now()`);
        }
      }
      const { rows } = await db.query<QueryableRow>(
        `update public.turfs set ${parts.join(', ')} where id = $1
         returning id, owner_id, name, description, address_line_1, address_line_2,
                   city, state, pincode, latitude, longitude, contact_phone, contact_email,
                   slot_duration_minutes, status, approval_status, rejection_reason,
                   submitted_at, approved_at, rejected_at, created_at, updated_at`,
        params,
      );
      return rows.length ? (rows[0] as unknown as TurfRow) : null;
    },

    async setStatus(id: string, status: TurfStatus): Promise<TurfRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `update public.turfs set status = $2 where id = $1
         returning id, owner_id, name, description, address_line_1, address_line_2,
                   city, state, pincode, latitude, longitude, contact_phone, contact_email,
                   slot_duration_minutes, status, approval_status, rejection_reason,
                   submitted_at, approved_at, rejected_at, created_at, updated_at`,
        [id, status],
      );
      return rows.length ? (rows[0] as unknown as TurfRow) : null;
    },

    async replaceSports(turfId: string, sportIds: string[]): Promise<void> {
      await db.query(`delete from public.turf_sports where turf_id = $1`, [turfId]);
      for (const sportId of sportIds) {
        await db.query(
          `insert into public.turf_sports (turf_id, sport_id) values ($1, $2)`,
          [turfId, sportId],
        );
      }
    },

    async list(filters: TurfListFilters): Promise<{ rows: TurfDetailRow[]; total: number }> {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (filters.search) {
        params.push(`%${filters.search}%`);
        conditions.push(`(t.name ilike $${params.length} or o.business_name ilike $${params.length})`);
      }
      if (filters.status) {
        params.push(filters.status);
        conditions.push(`t.status = $${params.length}`);
      }
      if (filters.approvalStatus) {
        params.push(filters.approvalStatus);
        conditions.push(`t.approval_status = $${params.length}`);
      }
      if (filters.city) {
        params.push(`%${filters.city}%`);
        conditions.push(`t.city ilike $${params.length}`);
      }
      if (filters.ownerId) {
        params.push(filters.ownerId);
        conditions.push(`t.owner_id = $${params.length}`);
      }

      const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
      const orderColumn = ['name', 'city', 'status', 'approval_status', 'created_at'].includes(
        filters.orderBy.column,
      )
        ? filters.orderBy.column === 'name'
          ? 't.name'
          : filters.orderBy.column === 'created_at'
            ? 't.created_at'
            : `t.${filters.orderBy.column}`
        : 't.created_at';

      const { rows: countRows } = await db.query<QueryableRow>(
        `select count(*)::int as total
         from public.turfs t
         join public.turf_owners o on o.id = t.owner_id
         join public.users u on u.id = o.user_id
         ${where}`,
        [...params],
      );
      const total = Number(countRows[0]?.total ?? 0);

      params.push(filters.limit, filters.offset);
      const { rows } = await db.query<QueryableRow>(
        `${TURF_SELECT}
         ${where}
         order by ${orderColumn} ${filters.orderBy.order}
         limit $${params.length - 1} offset $${params.length}`,
        params,
      );
      return { rows: rows.map(toTurfDetail), total };
    },

    async courtsCount(turfId: string): Promise<number> {
      const { rows } = await db.query<QueryableRow>(
        `select count(*)::int as total from public.courts where turf_id = $1`,
        [turfId],
      );
      return Number(rows[0]?.total ?? 0);
    },

    async operatingHoursCount(turfId: string): Promise<number> {
      const { rows } = await db.query<QueryableRow>(
        `select count(*)::int as total from public.turf_operating_hours where turf_id = $1`,
        [turfId],
      );
      return Number(rows[0]?.total ?? 0);
    },
  };
}

export type TurfRepo = ReturnType<typeof createTurfRepo>;
