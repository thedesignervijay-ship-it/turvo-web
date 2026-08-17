import type { DbClient, QueryableRow } from '../db/client.js';

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Date;
}

export interface CreateAuditInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditListFilters {
  search?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: string;
  to?: string;
  limit: number;
  offset: number;
  orderBy: { column: string; order: 'asc' | 'desc' };
}

const SELECT = `
  select a.id, a.user_id, a.action, a.entity_type, a.entity_id, a.old_value, a.new_value,
         a.ip_address, a.user_agent, a.created_at, u.name as user_name, u.email as user_email
  from public.audit_logs a
  left join public.users u on u.id = a.user_id`;

export function createAuditLogRepo(db: DbClient) {
  return {
    async create(input: CreateAuditInput): Promise<AuditLogRow> {
      const { rows } = await db.query<QueryableRow>(
        `insert into public.audit_logs
           (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent, created_at`,
        [
          input.userId ?? null,
          input.action,
          input.entityType,
          input.entityId ?? null,
          input.oldValue ? JSON.stringify(input.oldValue) : null,
          input.newValue ? JSON.stringify(input.newValue) : null,
          input.ipAddress ?? null,
          input.userAgent ?? null,
        ],
      );
      return rows[0] as unknown as AuditLogRow;
    },

    async list(
      filters: AuditListFilters,
    ): Promise<{ rows: (AuditLogRow & { user_name?: string | null; user_email?: string | null })[]; total: number }> {
      const conditions: string[] = [];
      const params: unknown[] = [];

      if (filters.search) {
        params.push(`%${filters.search}%`);
        conditions.push(`(a.action ilike $${params.length} or a.entity_type ilike $${params.length} or u.name ilike $${params.length})`);
      }
      if (filters.entityType) {
        params.push(filters.entityType);
        conditions.push(`a.entity_type = $${params.length}`);
      }
      if (filters.entityId) {
        params.push(filters.entityId);
        conditions.push(`a.entity_id = $${params.length}`);
      }
      if (filters.action) {
        params.push(filters.action);
        conditions.push(`a.action = $${params.length}`);
      }
      if (filters.from) {
        params.push(filters.from);
        conditions.push(`a.created_at >= $${params.length}::timestamptz`);
      }
      if (filters.to) {
        params.push(filters.to);
        conditions.push(`a.created_at <= $${params.length}::timestamptz`);
      }

      const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
      const orderColumn = ['action', 'entity_type', 'created_at'].includes(filters.orderBy.column)
        ? `a.${filters.orderBy.column}`
        : 'a.created_at';

      const countParams = [...params];
      const { rows: countRows } = await db.query<QueryableRow>(
        `select count(*)::int as total from public.audit_logs a ${where}`,
        countParams,
      );
      const total = Number(countRows[0]?.total ?? 0);

      params.push(filters.limit, filters.offset);
      const { rows } = await db.query<QueryableRow>(
        `${SELECT} ${where} order by ${orderColumn} ${filters.orderBy.order} limit $${params.length - 1} offset $${params.length}`,
        params,
      );
      return {
        rows: rows as unknown as (AuditLogRow & { user_name?: string | null; user_email?: string | null })[],
        total,
      };
    },
  };
}

export type AuditLogRepo = ReturnType<typeof createAuditLogRepo>;
