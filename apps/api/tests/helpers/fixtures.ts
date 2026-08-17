import type { DbClient } from '../../src/db/client.js';
import { kolkataDateStr } from '../../src/lib/time.js';

export const UUID = {
  ownerAUser: '10000000-0000-4000-8000-00000000000a',
  ownerBUser: '10000000-0000-4000-8000-00000000000b',
  adminUser: '10000000-0000-4000-8000-00000000000c',
  ownerA: '20000000-0000-4000-8000-00000000000a',
  ownerB: '20000000-0000-4000-8000-00000000000b',
  turfA: '30000000-0000-4000-8000-00000000000a',
  turfB: '30000000-0000-4000-8000-00000000000b',
} as const;

export async function seedUsers(db: DbClient): Promise<void> {
  await db.query(
    `insert into users (id, auth_user_id, role, name, email, phone, status) values
      ($1::uuid, $2::uuid, 'OWNER', 'Owner A', 'owner.a@example.com', '9000000001', 'ACTIVE'),
      ($3::uuid, $4::uuid, 'OWNER', 'Owner B', 'owner.b@example.com', '9000000002', 'ACTIVE'),
      ($5::uuid, $6::uuid, 'ADMIN', 'Admin', 'admin@example.com', '9000000003', 'ACTIVE')`,
    [UUID.ownerAUser, UUID.ownerAUser, UUID.ownerBUser, UUID.ownerBUser, UUID.adminUser, UUID.adminUser],
  );
  await db.query(
    `insert into turf_owners (id, user_id, business_name, business_phone, address_line_1, city, state, pincode, status) values
      ($1::uuid, $2::uuid, 'Owner A Turfs', '9000000001', 'Street A', 'Chennai', 'TN', '600001', 'ACTIVE'),
      ($3::uuid, $4::uuid, 'Owner B Turfs', '9000000002', 'Street B', 'Chennai', 'TN', '600002', 'ACTIVE')`,
    [UUID.ownerA, UUID.ownerAUser, UUID.ownerB, UUID.ownerBUser],
  );
}

export async function seedMasterItems(db: DbClient): Promise<void> {
  await db.query(
    `insert into master_items (category_id, name, description, status, sort_order)
     select c.id, v.name, null, 'ACTIVE', 1
     from (values ('SPORTS', 'Football')) as v(code, name)
     join master_categories c on c.code = v.code
     where not exists (
       select 1 from master_items mi join master_categories c2 on c2.id = mi.category_id
       where c2.code = 'SPORTS' and mi.name = 'Football'
     )`,
  );
}

export async function sportId(db: DbClient): Promise<string> {
  const { rows } = await db.query<{ id: string }>(
    `select mi.id from master_items mi join master_categories c on c.id = mi.category_id
     where c.code = 'SPORTS' and mi.name = 'Football'`,
  );
  return rows[0].id;
}

export interface ApprovedTurf {
  turfId: string;
  courtId: string;
  sportId: string;
}

/**
 * Creates an APPROVED+ACTIVE turf with one court, all seven days of operating
 * hours (06:00-23:00), its sport linkage and active pricing rules.
 */
export async function seedApprovedTurf(
  db: DbClient,
  opts: { turfId: string; ownerId: string; slotDuration?: number },
): Promise<ApprovedTurf> {
  const sId = await sportId(db);
  const slot = opts.slotDuration ?? 60;
  const turfId = opts.turfId;

  await db.query(
    `insert into turfs (id, owner_id, name, description, address_line_1, city, state, pincode, contact_phone, slot_duration_minutes, status, approval_status, approved_at)
     values ($1::uuid, $2::uuid, $3, 'desc', 'Street X', 'Chennai', 'TN', '600001', '9000000001', $4, 'ACTIVE', 'APPROVED', now())`,
    [turfId, opts.ownerId, 'Green Turf', slot],
  );
  await db.query(
    `insert into turf_sports (turf_id, sport_id) values ($1::uuid, $2::uuid)`,
    [turfId, sId],
  );
  const courtId = `${turfId.slice(0, 8)}-0000-4000-8000-${turfId.slice(24)}`;
  await db.query(
    `insert into courts (turf_id, sport_id, name, description, capacity, status) values ($1::uuid, $2::uuid, 'Court 1', 'Main court', 10, 'ACTIVE') returning id`,
    [turfId, sId],
  );
  const { rows } = await db.query<{ id: string }>(
    `select id from courts where turf_id = $1::uuid order by created_at desc limit 1`,
    [turfId],
  );
  const cId = rows[0].id;

  await db.query(
    `insert into turf_operating_hours (turf_id, day_of_week, opening_time, closing_time, is_closed)
     select $1::uuid, g, '06:00', '23:00', false from generate_series(0, 6) as g`,
    [turfId],
  );

  await db.query(
    `insert into pricing_rules (turf_id, court_id, start_time, end_time, day_type, price, currency, effective_from, status)
     values
      ($1::uuid, $2::uuid, '06:00', '23:00', 'WEEKDAY', 500, 'INR', (now() - interval '30 days')::date, 'ACTIVE'),
      ($1::uuid, $2::uuid, '06:00', '23:00', 'WEEKEND', 600, 'INR', (now() - interval '30 days')::date, 'ACTIVE')`,
    [turfId, cId],
  );

  return { turfId, courtId: cId, sportId: sId };
}

/** Returns a future date (Kolkata) `days` days from today. */
export function futureDate(days: number, now = new Date()): string {
  const d = new Date(now.getTime() + days * 86_400_000);
  return kolkataDateStr(d);
}

/** Returns the next date (>= tomorrow) whose Kolkata day-of-week matches. */
export function nextDateWithDow(targetDow: number, now = new Date()): string {
  let d = new Date(now.getTime() + 86_400_000);
  for (;;) {
    const date = kolkataDateStr(d);
    const dow = new Date(Date.UTC(...(date.split('-').map(Number) as [number, number, number]))).getUTCDay();
    if (dow === targetDow) return date;
    d = new Date(d.getTime() + 86_400_000);
  }
}
