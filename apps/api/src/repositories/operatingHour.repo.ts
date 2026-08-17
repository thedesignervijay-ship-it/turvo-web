import type { DbClient, QueryableRow } from '../db/client.js';

export interface OperatingHourRow {
  id: string;
  turf_id: string;
  day_of_week: number;
  opening_time: string;
  closing_time: string;
  is_closed: boolean;
  created_at: Date;
  updated_at: Date;
}

function toOperatingHour(row: QueryableRow): OperatingHourRow {
  return {
    id: String(row.id),
    turf_id: String(row.turf_id),
    day_of_week: Number(row.day_of_week),
    opening_time: String(row.opening_time),
    closing_time: String(row.closing_time),
    is_closed: Boolean(row.is_closed),
    created_at: new Date(String(row.created_at)),
    updated_at: new Date(String(row.updated_at)),
  };
}

export function createOperatingHourRepo(db: DbClient) {
  return {
    async listByTurf(turfId: string): Promise<OperatingHourRow[]> {
      const { rows } = await db.query<QueryableRow>(
        `select id, turf_id, day_of_week, opening_time, closing_time, is_closed, created_at, updated_at
         from public.turf_operating_hours where turf_id = $1 order by day_of_week asc`,
        [turfId],
      );
      return rows.map(toOperatingHour);
    },

    async countByTurf(turfId: string): Promise<number> {
      const { rows } = await db.query<QueryableRow>(
        `select count(*)::int as total from public.turf_operating_hours where turf_id = $1`,
        [turfId],
      );
      return Number(rows[0]?.total ?? 0);
    },

    /** Replaces the weekly schedule (all seven days) within a transaction. */
    async replace(
      tx: DbClient,
      turfId: string,
      days: { dayOfWeek: number; openingTime: string; closingTime: string; isClosed: boolean }[],
    ): Promise<void> {
      await tx.query(`delete from public.turf_operating_hours where turf_id = $1`, [turfId]);
      for (const d of days) {
        await tx.query(
          `insert into public.turf_operating_hours (turf_id, day_of_week, opening_time, closing_time, is_closed)
           values ($1, $2, $3::time, $4::time, $5)`,
          [turfId, d.dayOfWeek, d.openingTime, d.closingTime, d.isClosed],
        );
      }
    },
  };
}

export type OperatingHourRepo = ReturnType<typeof createOperatingHourRepo>;
