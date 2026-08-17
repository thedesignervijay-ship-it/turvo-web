import type { DbClient, QueryableRow } from '../db/client.js';
import type { MasterItemStatus } from '@turvo/shared';

export interface MasterCategoryRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  created_at: Date;
}

export interface MasterItemRow {
  id: string;
  category_id: string;
  category_code: string;
  category_name: string;
  name: string;
  description: string | null;
  status: MasterItemStatus;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export function createMasterRepo(db: DbClient) {
  return {
    /** Returns the ACTIVE SPORTS master items whose ids are in the given list. */
    async findActiveSportsByIds(ids: string[]): Promise<MasterItemRow[]> {
      if (ids.length === 0) return [];
      const { rows } = await db.query<QueryableRow>(
        `select mi.id, mi.category_id, c.code as category_code, c.name as category_name,
                mi.name, mi.description, mi.status, mi.sort_order, mi.created_at, mi.updated_at
         from public.master_items mi
         join public.master_categories c on c.id = mi.category_id
         where c.code = 'SPORTS' and mi.status = 'ACTIVE' and mi.id = any($1::uuid[])`,
        [ids],
      );
      return rows as unknown as MasterItemRow[];
    },

    async findCategoryByCode(code: string): Promise<MasterCategoryRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `select id, code, name, description, created_at
         from public.master_categories where code = $1 and status = 'ACTIVE'`,
        [code],
      );
      return rows.length ? (rows[0] as unknown as MasterCategoryRow) : null;
    },

    async findItemById(id: string): Promise<MasterItemRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `select mi.id, mi.category_id, c.code as category_code, c.name as category_name,
                mi.name, mi.description, mi.status, mi.sort_order, mi.created_at, mi.updated_at
         from public.master_items mi
         join public.master_categories c on c.id = mi.category_id
         where mi.id = $1::uuid`,
        [id],
      );
      return rows.length ? (rows[0] as unknown as MasterItemRow) : null;
    },

    /** Returns the ACTIVE FACILITIES/RULES/EQUIPMENT items matching the ids. */
    async findActiveSelectableByIds(ids: string[]): Promise<MasterItemRow[]> {
      if (ids.length === 0) return [];
      const { rows } = await db.query<QueryableRow>(
        `select mi.id, mi.category_id, c.code as category_code, c.name as category_name,
                mi.name, mi.description, mi.status, mi.sort_order, mi.created_at, mi.updated_at
         from public.master_items mi
         join public.master_categories c on c.id = mi.category_id
         where c.code <> 'SPORTS' and mi.status = 'ACTIVE' and mi.id = any($1::uuid[])`,
        [ids],
      );
      return rows as unknown as MasterItemRow[];
    },

    async create(input: {
      categoryCode: string;
      name: string;
      description: string | null;
      iconPath: string | null;
      sortOrder: number;
      createdBy: string;
    }): Promise<MasterItemRow> {
      const { rows } = await db.query<QueryableRow>(
        `insert into public.master_items (category_id, name, description, icon_path, sort_order, created_by, updated_by)
         select c.id, $2, $3, $4, $5, $6, $6
         from public.master_categories c
         where c.code = $1
         returning id`,
        [input.categoryCode, input.name, input.description, input.iconPath, input.sortOrder, input.createdBy],
      );
      const item = await this.findItemById(String(rows[0]!.id));
      if (!item) throw new Error('Master item insert returned no row.');
      return item;
    },

    async update(
      id: string,
      changes: {
        name?: string;
        description?: string | null;
        iconPath?: string | null;
        sortOrder?: number;
        updatedBy: string;
      },
    ): Promise<MasterItemRow | null> {
      const sets: string[] = [];
      const params: unknown[] = [];
      const set = (col: string, val: unknown) => {
        params.push(val);
        sets.push(`${col} = $${params.length}`);
      };
      if (changes.name !== undefined) set('name', changes.name);
      if (changes.description !== undefined) set('description', changes.description);
      if (changes.iconPath !== undefined) set('icon_path', changes.iconPath);
      if (changes.sortOrder !== undefined) set('sort_order', changes.sortOrder);
      params.push(changes.updatedBy, id);
      if (sets.length === 0) return null;
      await db.query(
        `update public.master_items set ${sets.join(', ')}, updated_by = $${params.length - 1} where id = $${params.length}`,
        params,
      );
      return this.findItemById(id);
    },

    async setStatus(id: string, status: MasterItemStatus, updatedBy: string): Promise<MasterItemRow | null> {
      await db.query(
        `update public.master_items set status = $2, updated_by = $3 where id = $1`,
        [id, status, updatedBy],
      );
      return this.findItemById(id);
    },

    /** Replaces the FACILITIES/RULES/EQUIPMENT selection for a turf. */
    async replaceTurfMasterItems(tx: DbClient, turfId: string, itemIds: string[]): Promise<void> {
      await tx.query(`delete from public.turf_master_items where turf_id = $1`, [turfId]);
      for (const itemId of itemIds) {
        await tx.query(
          `insert into public.turf_master_items (turf_id, master_item_id) values ($1::uuid, $2::uuid)`,
          [turfId, itemId],
        );
      }
    },

    async listTurfMasterItems(turfId: string): Promise<MasterItemRow[]> {
      const { rows } = await db.query<QueryableRow>(
        `select mi.id, mi.category_id, c.code as category_code, c.name as category_name,
                mi.name, mi.description, mi.status, mi.sort_order, mi.created_at, mi.updated_at
         from public.turf_master_items tmi
         join public.master_items mi on mi.id = tmi.master_item_id
         join public.master_categories c on c.id = mi.category_id
         where tmi.turf_id = $1::uuid
         order by c.code, mi.sort_order`,
        [turfId],
      );
      return rows as unknown as MasterItemRow[];
    },

    /** True when the given master item is an ACTIVE sport. */
    async isActiveSport(sportId: string): Promise<boolean> {
      const { rows } = await db.query<QueryableRow>(
        `select 1 from public.master_items mi
         join public.master_categories c on c.id = mi.category_id
         where c.code = 'SPORTS' and mi.status = 'ACTIVE' and mi.id = $1::uuid`,
        [sportId],
      );
      return rows.length > 0;
    },

    /** True when the turf supports the given sport. */
    async turfSupportsSport(turfId: string, sportId: string): Promise<boolean> {
      const { rows } = await db.query<QueryableRow>(
        `select 1 from public.turf_sports where turf_id = $1::uuid and sport_id = $2::uuid`,
        [turfId, sportId],
      );
      return rows.length > 0;
    },

    async listCategories(): Promise<MasterCategoryRow[]> {
      const { rows } = await db.query<QueryableRow>(
        `select id, code, name, description, created_at
         from public.master_categories order by name`,
      );
      return rows as unknown as MasterCategoryRow[];
    },

    async listItems(filters: {
      categoryCode?: string;
      status?: MasterItemStatus;
      limit: number;
      offset: number;
      orderBy: { column: string; order: 'asc' | 'desc' };
    }): Promise<{ rows: MasterItemRow[]; total: number }> {
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (filters.categoryCode) {
        params.push(filters.categoryCode);
        conditions.push(`c.code = $${params.length}`);
      }
      if (filters.status) {
        params.push(filters.status);
        conditions.push(`mi.status = $${params.length}`);
      }
      const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
      const orderColumn = ['name', 'category_name', 'status', 'sort_order', 'created_at'].includes(
        filters.orderBy.column,
      )
        ? filters.orderBy.column === 'category_name'
          ? 'c.name'
          : filters.orderBy.column === 'created_at'
            ? 'mi.created_at'
            : `mi.${filters.orderBy.column}`
        : 'mi.sort_order';

      const { rows: countRows } = await db.query<QueryableRow>(
        `select count(*)::int as total
         from public.master_items mi
         join public.master_categories c on c.id = mi.category_id
         ${where}`,
        [...params],
      );
      const total = Number(countRows[0]?.total ?? 0);

      params.push(filters.limit, filters.offset);
      const { rows } = await db.query<QueryableRow>(
        `select mi.id, mi.category_id, c.code as category_code, c.name as category_name,
                mi.name, mi.description, mi.status, mi.sort_order, mi.created_at, mi.updated_at
         from public.master_items mi
         join public.master_categories c on c.id = mi.category_id
         ${where}
         order by ${orderColumn} ${filters.orderBy.order}
         limit $${params.length - 1} offset $${params.length}`,
        params,
      );
      return { rows: rows as unknown as MasterItemRow[], total };
    },
  };
}

export type MasterRepo = ReturnType<typeof createMasterRepo>;
