import type { DbClient, QueryableRow } from '../db/client.js';

export interface TurfImageRow {
  id: string;
  turf_id: string;
  storage_path: string;
  is_primary: boolean;
  sort_order: number;
  created_at: Date;
}

const SELECT = `
  select id, turf_id, storage_path, is_primary, sort_order, created_at
  from public.turf_images`;

export function createTurfImageRepo(db: DbClient) {
  return {
    async countByTurf(turfId: string): Promise<number> {
      const { rows } = await db.query<QueryableRow>(
        `select count(*)::int as total from public.turf_images where turf_id = $1`,
        [turfId],
      );
      return Number(rows[0]?.total ?? 0);
    },

    async count(): Promise<number> {
      const { rows } = await db.query<QueryableRow>(`select count(*)::int as total from public.turf_images`);
      return Number(rows[0]?.total ?? 0);
    },

    async create(input: {
      turfId: string;
      storagePath: string;
      isPrimary: boolean;
      sortOrder: number;
    }): Promise<TurfImageRow> {
      const { rows } = await db.query<QueryableRow>(
        `insert into public.turf_images (turf_id, storage_path, is_primary, sort_order)
         values ($1, $2, $3, $4)
         returning id, turf_id, storage_path, is_primary, sort_order, created_at`,
        [input.turfId, input.storagePath, input.isPrimary, input.sortOrder],
      );
      return rows[0] as unknown as TurfImageRow;
    },

    async listByTurf(turfId: string): Promise<TurfImageRow[]> {
      const { rows } = await db.query<QueryableRow>(
        `${SELECT} where turf_id = $1 order by sort_order asc, created_at asc`,
        [turfId],
      );
      return rows as unknown as TurfImageRow[];
    },

    async findByTurfAndId(turfId: string, imageId: string): Promise<TurfImageRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `${SELECT} where turf_id = $1 and id = $2`,
        [turfId, imageId],
      );
      return rows.length ? (rows[0] as unknown as TurfImageRow) : null;
    },

    async delete(id: string): Promise<boolean> {
      const { rowCount } = await db.query(`delete from public.turf_images where id = $1`, [id]);
      return (rowCount ?? 0) > 0;
    },

    async setPrimary(turfId: string, imageId: string): Promise<void> {
      await db.query(`update public.turf_images set is_primary = false where turf_id = $1`, [turfId]);
      await db.query(`update public.turf_images set is_primary = true where turf_id = $1 and id = $2`, [
        turfId,
        imageId,
      ]);
    },

    async clearPrimary(turfId: string): Promise<void> {
      await db.query(`update public.turf_images set is_primary = false where turf_id = $1`, [turfId]);
    },

    async promoteFirst(turfId: string): Promise<void> {
      await db.query(
        `update public.turf_images set is_primary = true
         where id = (
           select id from public.turf_images
           where turf_id = $1
           order by sort_order asc, created_at asc
           limit 1
         )`,
        [turfId],
      );
    },

    async updateOrder(turfId: string, orderedIds: string[]): Promise<void> {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.query(
          `update public.turf_images set sort_order = $3
           where turf_id = $1 and id = $2`,
          [turfId, orderedIds[i], i + 1],
        );
      }
    },
  };
}

export type TurfImageRepo = ReturnType<typeof createTurfImageRepo>;
