import type { DbClient, QueryableRow } from '../db/client.js';

export interface AvailabilityBlockRow {
  id: string;
  turf_id: string;
  court_id: string | null;
  start_datetime: Date;
  end_datetime: Date;
  block_type: 'MAINTENANCE' | 'OWNER_BLOCK' | 'EMERGENCY';
  reason: string | null;
  created_by: string | null;
  created_at: Date;
}

function toBlock(row: QueryableRow): AvailabilityBlockRow {
  return {
    id: String(row.id),
    turf_id: String(row.turf_id),
    court_id: row.court_id == null ? null : String(row.court_id),
    start_datetime: new Date(String(row.start_datetime)),
    end_datetime: new Date(String(row.end_datetime)),
    block_type: String(row.block_type) as AvailabilityBlockRow['block_type'],
    reason: row.reason == null ? null : String(row.reason),
    created_by: row.created_by == null ? null : String(row.created_by),
    created_at: new Date(String(row.created_at)),
  };
}

export function createAvailabilityRepo(db: DbClient) {
  return {
    async create(input: {
      turfId: string;
      courtId: string | null;
      startDatetime: string;
      endDatetime: string;
      blockType: AvailabilityBlockRow['block_type'];
      reason: string | null;
      createdBy: string;
    }): Promise<AvailabilityBlockRow> {
      const { rows } = await db.query<QueryableRow>(
        `insert into public.availability_blocks
           (turf_id, court_id, start_datetime, end_datetime, block_type, reason, created_by)
         values ($1, $2, $3::timestamptz, $4::timestamptz, $5, $6, $7)
         returning id, turf_id, court_id, start_datetime, end_datetime, block_type, reason, created_by, created_at`,
        [
          input.turfId,
          input.courtId,
          input.startDatetime,
          input.endDatetime,
          input.blockType,
          input.reason,
          input.createdBy,
        ],
      );
      return toBlock(rows[0]!);
    },

    /** A block is owner-visible when its turf belongs to the owner. */
    async findOwnedById(blockId: string, ownerId: string): Promise<AvailabilityBlockRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `select ab.id, ab.turf_id, ab.court_id, ab.start_datetime, ab.end_datetime,
                ab.block_type, ab.reason, ab.created_by, ab.created_at
         from public.availability_blocks ab
         join public.turfs t on t.id = ab.turf_id
         where ab.id = $1 and t.owner_id = $2`,
        [blockId, ownerId],
      );
      return rows.length ? toBlock(rows[0]!) : null;
    },

    async deleteOwnedById(blockId: string, ownerId: string): Promise<boolean> {
      const { rowCount } = await db.query(
        `delete from public.availability_blocks ab
         using public.turfs t
         where ab.id = $1 and t.id = ab.turf_id and t.owner_id = $2`,
        [blockId, ownerId],
      );
      return (rowCount ?? 0) > 0;
    },

    /** Blocks overlapping the UTC interval, turf-wide or court-specific. */
    async overlapping(turfId: string, start: Date, end: Date): Promise<AvailabilityBlockRow[]> {
      const { rows } = await db.query<QueryableRow>(
        `select id, turf_id, court_id, start_datetime, end_datetime, block_type, reason, created_by, created_at
         from public.availability_blocks
         where turf_id = $1 and start_datetime < $3::timestamptz and end_datetime > $2::timestamptz`,
        [turfId, start.toISOString(), end.toISOString()],
      );
      return rows.map(toBlock);
    },
  };
}

export type AvailabilityRepo = ReturnType<typeof createAvailabilityRepo>;
