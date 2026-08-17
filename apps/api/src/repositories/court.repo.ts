import type { DbClient, QueryableRow } from '../db/client.js';

export interface CourtRow {
  id: string;
  turf_id: string;
  sport_id: string;
  name: string;
  description: string | null;
  capacity: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Date;
  updated_at: Date;
}

const SELECT = `
  select id, turf_id, sport_id, name, description, capacity, status, created_at, updated_at
  from public.courts`;

function toCourt(row: QueryableRow): CourtRow {
  return {
    id: String(row.id),
    turf_id: String(row.turf_id),
    sport_id: String(row.sport_id),
    name: String(row.name),
    description: row.description == null ? null : String(row.description),
    capacity: Number(row.capacity),
    status: String(row.status) as CourtRow['status'],
    created_at: new Date(String(row.created_at)),
    updated_at: new Date(String(row.updated_at)),
  };
}

export function createCourtRepo(db: DbClient) {
  return {
    async create(input: {
      turfId: string;
      sportId: string;
      name: string;
      description: string | null;
      capacity: number;
    }): Promise<CourtRow> {
      const { rows } = await db.query<QueryableRow>(
        `insert into public.courts (turf_id, sport_id, name, description, capacity)
         values ($1, $2, $3, $4, $5)
         returning id, turf_id, sport_id, name, description, capacity, status, created_at, updated_at`,
         [input.turfId, input.sportId, input.name, input.description, input.capacity],
      );
      return toCourt(rows[0]!);
    },

    async listByTurf(turfId: string): Promise<CourtRow[]> {
      const { rows } = await db.query<QueryableRow>(
        `${SELECT} where turf_id = $1 order by created_at asc, id asc`,
        [turfId],
      );
      return rows.map(toCourt);
    },

    async countByTurf(turfId: string): Promise<number> {
      const { rows } = await db.query<QueryableRow>(
        `select count(*)::int as total from public.courts where turf_id = $1`,
        [turfId],
      );
      return Number(rows[0]?.total ?? 0);
    },

    /** Court visible to an owner: the court's turf must belong to them. */
    async findOwnedById(courtId: string, ownerId: string): Promise<CourtRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `select c.id, c.turf_id, c.sport_id, c.name, c.description, c.capacity, c.status,
                c.created_at, c.updated_at
         from public.courts c
         join public.turfs t on t.id = c.turf_id
         where c.id = $1 and t.owner_id = $2`,
        [courtId, ownerId],
      );
      return rows.length ? toCourt(rows[0]!) : null;
    },

    async update(
      courtId: string,
      changes: { sportId?: string; name?: string; description?: string | null; capacity?: number },
    ): Promise<CourtRow | null> {
      const sets: string[] = [];
      const params: unknown[] = [];
      if (changes.sportId !== undefined) {
        params.push(changes.sportId);
        sets.push(`sport_id = $${params.length}`);
      }
      if (changes.name !== undefined) {
        params.push(changes.name);
        sets.push(`name = $${params.length}`);
      }
      if (changes.description !== undefined) {
        params.push(changes.description);
        sets.push(`description = $${params.length}`);
      }
      if (changes.capacity !== undefined) {
        params.push(changes.capacity);
        sets.push(`capacity = $${params.length}`);
      }
      if (sets.length === 0) return null;
      params.push(courtId);
      const { rows } = await db.query<QueryableRow>(
        `update public.courts
         set ${sets.join(', ')}
         where id = $${params.length}
         returning id, turf_id, sport_id, name, description, capacity, status, created_at, updated_at`,
        params,
      );
      return rows.length ? toCourt(rows[0]!) : null;
    },

    async setStatus(courtId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<CourtRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `update public.courts set status = $2
         where id = $1
         returning id, turf_id, sport_id, name, description, capacity, status, created_at, updated_at`,
        [courtId, status],
      );
      return rows.length ? toCourt(rows[0]!) : null;
    },
  };
}

export type CourtRepo = ReturnType<typeof createCourtRepo>;
