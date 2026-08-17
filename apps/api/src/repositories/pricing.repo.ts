import type { DbClient, QueryableRow } from '../db/client.js';

export interface PricingRuleRow {
  id: string;
  turf_id: string;
  court_id: string | null;
  start_time: string;
  end_time: string;
  day_type: 'WEEKDAY' | 'WEEKEND';
  price: number;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: Date;
  updated_at: Date;
}

const toDateStr = (v: unknown): string => {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
};

function toRule(row: QueryableRow): PricingRuleRow {
  return {
    id: String(row.id),
    turf_id: String(row.turf_id),
    court_id: row.court_id == null ? null : String(row.court_id),
    start_time: String(row.start_time),
    end_time: String(row.end_time),
    day_type: String(row.day_type) as PricingRuleRow['day_type'],
    price: Number(row.price),
    currency: String(row.currency),
    effective_from: toDateStr(row.effective_from),
    effective_to: row.effective_to == null ? null : toDateStr(row.effective_to),
    status: String(row.status) as PricingRuleRow['status'],
    created_at: new Date(String(row.created_at)),
    updated_at: new Date(String(row.updated_at)),
  };
}

export interface ActiveRuleConflictInput {
  turfId: string;
  courtId: string | null;
  dayType: 'WEEKDAY' | 'WEEKEND';
  startTime: string;
  endTime: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  excludeId?: string;
}

export function createPricingRepo(db: DbClient) {
  return {
    async create(input: {
      turfId: string;
      courtId: string | null;
      startTime: string;
      endTime: string;
      dayType: 'WEEKDAY' | 'WEEKEND';
      price: number;
      currency: string;
      effectiveFrom: string;
      effectiveTo: string | null;
    }): Promise<PricingRuleRow> {
      const { rows } = await db.query<QueryableRow>(
        `insert into public.pricing_rules
           (turf_id, court_id, start_time, end_time, day_type, price, currency, effective_from, effective_to)
         values ($1, $2, $3::time, $4::time, $5, $6, $7, $8::date, $9::date)
         returning id, turf_id, court_id, start_time, end_time, day_type, price, currency,
                   effective_from, effective_to, status, created_at, updated_at`,
        [
          input.turfId,
          input.courtId,
          input.startTime,
          input.endTime,
          input.dayType,
          input.price,
          input.currency,
          input.effectiveFrom,
          input.effectiveTo,
        ],
      );
      return toRule(rows[0]!);
    },

    async listByTurf(turfId: string): Promise<PricingRuleRow[]> {
      const { rows } = await db.query<QueryableRow>(
        `select id, turf_id, court_id, start_time, end_time, day_type, price, currency,
                effective_from, effective_to, status, created_at, updated_at
         from public.pricing_rules where turf_id = $1 order by created_at asc, id asc`,
        [turfId],
      );
      return rows.map(toRule);
    },

    /** Rule visible to an owner: the rule's turf must belong to them. */
    async findOwnedById(ruleId: string, ownerId: string): Promise<PricingRuleRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `select p.id, p.turf_id, p.court_id, p.start_time, p.end_time, p.day_type, p.price,
                p.currency, p.effective_from, p.effective_to, p.status, p.created_at, p.updated_at
         from public.pricing_rules p
         join public.turfs t on t.id = p.turf_id
         where p.id = $1 and t.owner_id = $2`,
        [ruleId, ownerId],
      );
      return rows.length ? toRule(rows[0]!) : null;
    },

    async update(
      ruleId: string,
      changes: {
        courtId?: string | null;
        startTime?: string;
        endTime?: string;
        dayType?: 'WEEKDAY' | 'WEEKEND';
        price?: number;
        currency?: string;
        effectiveFrom?: string;
        effectiveTo?: string | null;
      },
    ): Promise<PricingRuleRow | null> {
      const sets: string[] = [];
      const params: unknown[] = [];
      const set = (col: string, val: unknown, cast: string) => {
        params.push(val);
        sets.push(`${col} = $${params.length}${cast}`);
      };
      if (changes.courtId !== undefined) set('court_id', changes.courtId, '');
      if (changes.startTime !== undefined) set('start_time', changes.startTime, '::time');
      if (changes.endTime !== undefined) set('end_time', changes.endTime, '::time');
      if (changes.dayType !== undefined) set('day_type', changes.dayType, '');
      if (changes.price !== undefined) set('price', changes.price, '');
      if (changes.currency !== undefined) set('currency', changes.currency, '');
      if (changes.effectiveFrom !== undefined) set('effective_from', changes.effectiveFrom, '::date');
      if (changes.effectiveTo !== undefined) set('effective_to', changes.effectiveTo, '::date');
      if (sets.length === 0) return null;
      params.push(ruleId);
      const { rows } = await db.query<QueryableRow>(
        `update public.pricing_rules set ${sets.join(', ')} where id = $${params.length}
         returning id, turf_id, court_id, start_time, end_time, day_type, price, currency,
                   effective_from, effective_to, status, created_at, updated_at`,
        params,
      );
      return rows.length ? toRule(rows[0]!) : null;
    },

    async setStatus(ruleId: string, status: 'ACTIVE' | 'INACTIVE'): Promise<PricingRuleRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `update public.pricing_rules set status = $2 where id = $1
         returning id, turf_id, court_id, start_time, end_time, day_type, price, currency,
                   effective_from, effective_to, status, created_at, updated_at`,
        [ruleId, status],
      );
      return rows.length ? toRule(rows[0]!) : null;
    },

    /**
     * Overlap check (spec section 13): another ACTIVE rule with the same court
     * scope (court_id equal, null matching null), day type and overlapping
     * time range and effective period.
     */
    async hasOverlappingActive(input: ActiveRuleConflictInput): Promise<boolean> {
      const params: unknown[] = [
        input.turfId,
        input.courtId,
        input.dayType,
        input.startTime,
        input.endTime,
        input.effectiveFrom,
        input.effectiveTo ?? null,
      ];
      if (input.excludeId) params.push(input.excludeId);
      const exclude = input.excludeId ? ` and id <> $${params.length}::uuid` : '';
      const { rows } = await db.query<QueryableRow>(
        `select 1 from public.pricing_rules
         where turf_id = $1::uuid
           and court_id is not distinct from $2::uuid
           and day_type = $3
           and status = 'ACTIVE'
           and start_time < $5::time
           and end_time > $4::time
           and (effective_from <= $6::date and (effective_to is null or effective_to >= $6::date))
           and (coalesce($7::date, 'infinity'::date) >= effective_from)
           and (effective_to is null or effective_to >= $6::date)${exclude}
         limit 1`,
        params,
      );
      return rows.length > 0;
    },

    /**
     * Active rule that prices the given slot: court-specific rules win over
     * turf-wide rules (court_id null).
     */
    async findActiveForSlot(input: {
      turfId: string;
      courtId: string;
      date: string;
      startTime: string;
      endTime: string;
      dayType: 'WEEKDAY' | 'WEEKEND';
    }): Promise<PricingRuleRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `select id, turf_id, court_id, start_time, end_time, day_type, price, currency,
                effective_from, effective_to, status, created_at, updated_at
         from public.pricing_rules
         where turf_id = $1::uuid
           and status = 'ACTIVE'
           and day_type = $6
           and (court_id = $2::uuid or court_id is null)
           and start_time <= $3::time
           and end_time >= $4::time
           and effective_from <= $5::date
           and (effective_to is null or effective_to >= $5::date)
         order by (court_id = $2::uuid) desc, start_time asc
         limit 1`,
        [input.turfId, input.courtId, input.startTime, input.endTime, input.date, input.dayType],
      );
      return rows.length ? toRule(rows[0]!) : null;
    },
  };
}

export type PricingRepo = ReturnType<typeof createPricingRepo>;
