import type { DbClient, QueryableRow } from '../db/client.js';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: Date | null;
  created_at: Date;
}

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | null;
}

const SELECT = `
  select id, user_id, type, title, message, entity_type, entity_id, is_read, read_at, created_at
  from public.notifications`;

export function createNotificationRepo(db: DbClient) {
  return {
    async create(input: CreateNotificationInput): Promise<NotificationRow> {
      const { rows } = await db.query<QueryableRow>(
        `insert into public.notifications (user_id, type, title, message, entity_type, entity_id)
         values ($1, $2, $3, $4, $5, $6)
         returning id, user_id, type, title, message, entity_type, entity_id, is_read, read_at, created_at`,
        [
          input.userId,
          input.type,
          input.title,
          input.message,
          input.entityType ?? null,
          input.entityId ?? null,
        ],
      );
      return rows[0] as unknown as NotificationRow;
    },

    /** Inserts one notification for every active admin (e.g. owner registration). */
    async createForActiveAdmins(input: Omit<CreateNotificationInput, 'userId'>): Promise<number> {
      const { rowCount } = await db.query<QueryableRow>(
        `insert into public.notifications (user_id, type, title, message, entity_type, entity_id)
         select id, $1, $2, $3, $4, $5 from public.users
         where role = 'ADMIN' and status = 'ACTIVE'`,
        [input.type, input.title, input.message, input.entityType ?? null, input.entityId ?? null],
      );
      return rowCount ?? 0;
    },

    async listByUser(
      userId: string,
      filters: { limit: number; offset: number; unreadOnly?: boolean },
    ): Promise<{ rows: NotificationRow[]; total: number }> {
      const conditions = ['user_id = $1'];
      const params: unknown[] = [userId];
      if (filters.unreadOnly) {
        conditions.push('is_read = false');
      }
      const where = `where ${conditions.join(' and ')}`;
      const { rows: countRows } = await db.query<QueryableRow>(
        `select count(*)::int as total from public.notifications ${where}`,
        params,
      );
      const total = Number(countRows[0]?.total ?? 0);
      params.push(filters.limit, filters.offset);
      const { rows } = await db.query<QueryableRow>(
        `${SELECT} ${where} order by created_at desc limit $${params.length - 1} offset $${params.length}`,
        params,
      );
      return { rows: rows as unknown as NotificationRow[], total };
    },

    async unreadCount(userId: string): Promise<number> {
      const { rows } = await db.query<QueryableRow>(
        `select count(*)::int as total from public.notifications where user_id = $1 and is_read = false`,
        [userId],
      );
      return Number(rows[0]?.total ?? 0);
    },

    async markRead(id: string, userId: string): Promise<boolean> {
      const { rowCount } = await db.query<QueryableRow>(
        `update public.notifications set is_read = true, read_at = coalesce(read_at, now())
         where id = $1 and user_id = $2`,
        [id, userId],
      );
      return (rowCount ?? 0) > 0;
    },

    async findById(id: string, userId: string): Promise<NotificationRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `${SELECT} where id = $1::uuid and user_id = $2::uuid`,
        [id, userId],
      );
      return rows.length ? (rows[0] as unknown as NotificationRow) : null;
    },

    async markAllRead(userId: string): Promise<number> {
      const { rowCount } = await db.query<QueryableRow>(
        `update public.notifications set is_read = true, read_at = coalesce(read_at, now())
         where user_id = $1 and is_read = false`,
        [userId],
      );
      return rowCount ?? 0;
    },
  };
}

export type NotificationRepo = ReturnType<typeof createNotificationRepo>;
