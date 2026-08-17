import type { DbClient, QueryableRow } from '../db/client.js';
import type { OwnerStatus } from '@turvo/shared';

export interface OwnerRow {
  id: string;
  user_id: string;
  business_name: string;
  business_phone: string;
  business_email: string | null;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  state: string;
  pincode: string;
  status: OwnerStatus;
  created_at: Date;
  updated_at: Date;
}

export interface OwnerWithUserRow extends OwnerRow {
  user_name: string;
  user_email: string;
  user_phone: string;
  user_status: OwnerStatus;
  user_last_login_at: Date | null;
  turf_count?: number;
}

export interface CreateOwnerInput {
  userId: string;
  businessName: string;
  businessPhone: string;
  businessEmail?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
}

export interface UpdateOwnerInput {
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface OwnerListFilters {
  search?: string;
  status?: OwnerStatus;
  city?: string;
  limit: number;
  offset: number;
  orderBy: { column: string; order: 'asc' | 'desc' };
}

const OWNER_SELECT = `
  select o.id, o.user_id, o.business_name, o.business_phone, o.business_email,
         o.address_line_1, o.address_line_2, o.city, o.state, o.pincode, o.status,
         o.created_at, o.updated_at,
         u.name as user_name, u.email as user_email, u.phone as user_phone,
         u.status as user_status, u.last_login_at as user_last_login_at,
         (select count(*)::int from public.turfs t where t.owner_id = o.id) as turf_count
  from public.turf_owners o
  join public.users u on u.id = o.user_id`;

function toOwnerWithUser(row: QueryableRow): OwnerWithUserRow {
  return row as unknown as OwnerWithUserRow;
}

export function createOwnerRepo(db: DbClient) {
  return {
    async findByUserId(userId: string): Promise<OwnerRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `select id, user_id, business_name, business_phone, business_email,
                address_line_1, address_line_2, city, state, pincode, status, created_at, updated_at
         from public.turf_owners where user_id = $1`,
        [userId],
      );
      return rows.length ? (rows[0] as unknown as OwnerRow) : null;
    },

    async findById(id: string): Promise<OwnerWithUserRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `${OWNER_SELECT} where o.id = $1`,
        [id],
      );
      return rows.length ? toOwnerWithUser(rows[0]!) : null;
    },

    async create(input: CreateOwnerInput): Promise<OwnerRow> {
      const { rows } = await db.query<QueryableRow>(
        `insert into public.turf_owners
           (user_id, business_name, business_phone, business_email,
            address_line_1, address_line_2, city, state, pincode, status)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'ACTIVE')
         returning id, user_id, business_name, business_phone, business_email,
                   address_line_1, address_line_2, city, state, pincode, status, created_at, updated_at`,
        [
          input.userId,
          input.businessName,
          input.businessPhone,
          input.businessEmail ?? null,
          input.addressLine1,
          input.addressLine2 ?? null,
          input.city,
          input.state,
          input.pincode,
        ],
      );
      return rows[0] as unknown as OwnerRow;
    },

    async update(id: string, input: UpdateOwnerInput): Promise<OwnerRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `update public.turf_owners
         set business_name = coalesce($2, business_name),
             business_phone = coalesce($3, business_phone),
             business_email = coalesce($4, business_email),
             address_line_1 = coalesce($5, address_line_1),
             address_line_2 = coalesce($6, address_line_2),
             city = coalesce($7, city),
             state = coalesce($8, state),
             pincode = coalesce($9, pincode)
         where id = $1
         returning id, user_id, business_name, business_phone, business_email,
                   address_line_1, address_line_2, city, state, pincode, status, created_at, updated_at`,
        [
          id,
          input.businessName ?? null,
          input.businessPhone ?? null,
          input.businessEmail === undefined ? null : input.businessEmail,
          input.addressLine1 ?? null,
          input.addressLine2 === undefined ? null : input.addressLine2,
          input.city ?? null,
          input.state ?? null,
          input.pincode ?? null,
        ],
      );
      return rows.length ? (rows[0] as unknown as OwnerRow) : null;
    },

    async setStatus(id: string, status: OwnerStatus): Promise<OwnerRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `update public.turf_owners set status = $2 where id = $1
         returning id, user_id, business_name, business_phone, business_email,
                   address_line_1, address_line_2, city, state, pincode, status, created_at, updated_at`,
        [id, status],
      );
      return rows.length ? (rows[0] as unknown as OwnerRow) : null;
    },

    async list(filters: OwnerListFilters): Promise<{ rows: OwnerWithUserRow[]; total: number }> {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (filters.search) {
        params.push(`%${filters.search}%`);
        conditions.push(
          `(o.business_name ilike $${params.length} or u.name ilike $${params.length} or u.email ilike $${params.length})`,
        );
      }
      if (filters.status) {
        params.push(filters.status);
        conditions.push(`o.status = $${params.length}`);
      }
      if (filters.city) {
        params.push(`%${filters.city}%`);
        conditions.push(`o.city ilike $${params.length}`);
      }

      const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
      const orderColumn = ['business_name', 'city', 'created_at', 'status', 'user_name'].includes(
        filters.orderBy.column,
      )
        ? filters.orderBy.column === 'user_name'
          ? 'u.name'
          : `o.${filters.orderBy.column}`
        : 'o.created_at';

      const countParams = [...params];
      const { rows: countRows } = await db.query<QueryableRow>(
        `select count(*)::int as total
         from public.turf_owners o
         join public.users u on u.id = o.user_id
         ${where}`,
        countParams,
      );
      const total = Number(countRows[0]?.total ?? 0);

      params.push(filters.limit, filters.offset);
      const { rows } = await db.query<QueryableRow>(
        `${OWNER_SELECT}
         ${where}
         order by ${orderColumn} ${filters.orderBy.order}
         limit $${params.length - 1} offset $${params.length}`,
        params,
      );

      return { rows: rows.map(toOwnerWithUser), total };
    },
  };
}

export type OwnerRepo = ReturnType<typeof createOwnerRepo>;
