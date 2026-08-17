/**
 * Turvo migration verification harness.
 *
 * Applies supabase/migrations/*.sql in filename order against an ephemeral
 * WASM Postgres (PGlite) and runs assertions covering the schema, constraints,
 * RLS behavior and the booking double-booking exclusion constraint.
 *
 * Usage: npm run verify:migrations
 */
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const MIGRATIONS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'supabase',
  'migrations',
);

let passed = 0;
let failed = 0;
const failures = [];

function check(name, cond, detail = '') {
  if (cond) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function expectError(run, name, detail) {
  try {
    run();
    failed += 1;
    failures.push(name);
    console.log(`  FAIL  ${name} — expected an error but none was thrown`);
  } catch (err) {
    passed += 1;
    console.log(`  PASS  ${name}`);
    if (detail && detail(err)) {
      check(`  detail (${name})`, true, detail(err));
    }
  }
}

async function main() {
  const db = new PGlite({ extensions: { btree_gist } });

  // --- Supabase parity setup ------------------------------------------------
  // The `auth` schema and `auth.uid()` exist in Supabase but not in vanilla
  // Postgres. uid() reads a session GUC so tests can impersonate users.
  await db.exec(`
    create schema if not exists auth;
    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$
      select nullif(current_setting('app.uid', true), '')::uuid;
    $$;
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
      end if;
    end $$;
    grant usage on schema public to anon, authenticated;
    grant usage on schema auth to anon, authenticated;
  `);

  // --- Apply migrations in order --------------------------------------------
  console.log('\nApplying migrations:');
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) throw new Error('No migration files found');

  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    try {
      await db.exec(sql);
      console.log(`  OK    ${file}`);
    } catch (err) {
      console.error(`\n  ERROR ${file}: ${err.message}`);
      process.exit(1);
    }
  }

  // RLS helper functions are created by 018; grant execution now that they
  // exist. Tables are granted now too so the authenticated role can exercise
  // RLS policies (in Supabase these grants come from default privileges).
  await db.exec(`
    grant select, insert, update, delete on all tables in schema public to anon, authenticated;
    grant execute on function public.current_user_role() to anon, authenticated;
    grant execute on function public.is_admin() to anon, authenticated;
    grant execute on function public.is_owner() to anon, authenticated;
  `);

  // --- Schema assertions -----------------------------------------------------
  console.log('\nSchema assertions:');

  const { rows: tables } = await db.query(
    `select tablename from pg_tables where schemaname = 'public' order by tablename`,
  );
  const tableNames = new Set(tables.map((t) => t.tablename));
  const expectedTables = [
    'users', 'turf_owners', 'master_categories', 'master_items', 'turfs',
    'turf_images', 'turf_master_items', 'turf_sports', 'courts',
    'turf_operating_hours', 'availability_blocks', 'pricing_rules', 'bookings',
    'notifications', 'audit_logs', 'platform_settings',
  ];
  for (const t of expectedTables) {
    check(`table ${t} exists`, tableNames.has(t));
  }

  const { rows: rlsTables } = await db.query(
    `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity`,
  );
  const rlsEnabled = new Set(rlsTables.map((t) => t.relname));
  const rlsExpected = [
    'users', 'turf_owners', 'master_categories', 'master_items', 'turfs',
    'turf_images', 'turf_master_items', 'turf_sports', 'courts',
    'turf_operating_hours', 'availability_blocks', 'pricing_rules', 'bookings',
    'notifications', 'audit_logs', 'platform_settings',
  ];
  for (const t of rlsExpected) {
    check(`RLS enabled on ${t}`, rlsEnabled.has(t));
  }

  const { rows: usersCols } = await db.query(
    `select column_name from information_schema.columns
     where table_schema = 'public' and table_name = 'users'`,
  );
  const usersColsSet = new Set(usersCols.map((c) => c.column_name));
  for (const c of ['id', 'auth_user_id', 'role', 'name', 'email', 'phone', 'status', 'last_login_at', 'created_at', 'updated_at']) {
    check(`users.${c} exists`, usersColsSet.has(c));
  }

  const { rows: constraints } = await db.query(
    `select conname from pg_constraint
     where connamespace = (select oid from pg_namespace where nspname = 'public')
     and contype in ('c', 'u', 'x', 'p', 'f')`,
  );
  const conSet = new Set(constraints.map((c) => c.conname));
  const expectedConstraints = [
    'uq_master_items_category_name',
    'uq_turf_master_items',
    'uq_turf_sports',
    'uq_turf_operating_hours_day',
    'chk_active_requires_approval',
    'chk_rejection_requires_reason',
    'chk_opening_before_closing',
    'chk_block_start_before_end',
    'fk_block_court_belongs_to_turf',
    'chk_booking_start_before_end',
    'chk_cancellation_requires_reason',
    'uq_booking_no_active_overlap',
  ];
  for (const c of expectedConstraints) {
    check(`constraint ${c} exists`, conSet.has(c));
  }
  const { rows: indexes } = await db.query(
    `select indexname from pg_indexes where schemaname = 'public'`,
  );
  check(
    'partial unique index uq_turf_images_one_primary exists',
    indexes.some((i) => i.indexname === 'uq_turf_images_one_primary'),
  );

  const { rows: excludeCon } = await db.query(
    `select contype, pg_get_constraintdef(oid) as def from pg_constraint
     where conname = 'uq_booking_no_active_overlap'`,
  );
  check(
    'booking overlap is a partial exclusion constraint (GiST)',
    excludeCon.length === 1 && excludeCon[0].contype === 'x' && /WHERE.*booking_status.*CONFIRMED/.test(excludeCon[0].def),
  );

  // --- Seed data assertions ---------------------------------------------------
  console.log('\nSeed data assertions:');
  const { rows: cats } = await db.query(`select code from master_categories order by code`);
  const catCodes = cats.map((c) => c.code);
  for (const c of ['SPORTS', 'FACILITIES', 'RULES', 'EQUIPMENT']) {
    check(`category ${c} seeded`, catCodes.includes(c));
  }
  const { rows: itemCounts } = await db.query(
    `select c.code, count(mi.id)::int as n from master_categories c
     left join master_items mi on mi.category_id = c.id
     group by c.code order by c.code`,
  );
  for (const row of itemCounts) {
    check(`master_items for ${row.code} >= 1`, row.n >= 1);
  }

  // --- Business fixtures (service role) ---------------------------------------
  console.log('\nSetting up business fixtures (service role):');
  const uuid = {
    ownerAUser: '00000000-0000-0000-0000-00000000000a',
    ownerBUser: '00000000-0000-0000-0000-00000000000b',
    adminUser: '00000000-0000-0000-0000-00000000000c',
  };
  await db.exec(`
    insert into users (id, auth_user_id, role, name, email, phone, status) values
      ('${uuid.ownerAUser}', '${uuid.ownerAUser}', 'OWNER', 'Owner A', 'owner.a@example.com', '9000000001', 'ACTIVE'),
      ('${uuid.ownerBUser}', '${uuid.ownerBUser}', 'OWNER', 'Owner B', 'owner.b@example.com', '9000000002', 'ACTIVE'),
      ('${uuid.adminUser}', '${uuid.adminUser}', 'ADMIN', 'Admin', 'admin@example.com', '9000000003', 'ACTIVE');

    insert into turf_owners (id, user_id, business_name, business_phone, city, state, pincode, address_line_1, status) values
      ('20000000-0000-0000-0000-00000000000a', '${uuid.ownerAUser}', 'Owner A Turfs', '9000000001', 'Chennai', 'TN', '600001', 'Street A', 'ACTIVE'),
      ('20000000-0000-0000-0000-00000000000b', '${uuid.ownerBUser}', 'Owner B Turfs', '9000000002', 'Chennai', 'TN', '600002', 'Street B', 'ACTIVE');

    insert into turfs (id, owner_id, name, description, address_line_1, city, state, pincode, contact_phone, status, approval_status) values
      ('30000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-00000000000a', 'Turf A', 'desc', 'Street A', 'Chennai', 'TN', '600001', '9000000001', 'ACTIVE', 'APPROVED'),
      ('30000000-0000-0000-0000-00000000000b', '20000000-0000-0000-0000-00000000000b', 'Turf B', 'desc', 'Street B', 'Chennai', 'TN', '600002', '9000000002', 'ACTIVE', 'APPROVED');

    insert into courts (id, turf_id, sport_id, name, capacity, status) values
      ('40000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a',
       (select id from master_items where name = 'Football' and category_id = (select id from master_categories where code = 'SPORTS')), 'Court 1A', 10, 'ACTIVE'),
      ('40000000-0000-0000-0000-00000000000b', '30000000-0000-0000-0000-00000000000b',
       (select id from master_items where name = 'Football' and category_id = (select id from master_categories where code = 'SPORTS')), 'Court 1B', 10, 'ACTIVE');

    insert into turf_operating_hours (turf_id, day_of_week, opening_time, closing_time, is_closed) values
      ('30000000-0000-0000-0000-00000000000a', 1, '06:00', '23:00', false);

    insert into bookings
      (booking_reference, turf_id, court_id, sport_id, customer_name, customer_phone,
       booking_date, start_time, end_time, duration_minutes, base_amount, total_amount,
       booking_source, booking_status, created_by)
    values
      ('REF-A-001', '30000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-00000000000a',
       (select id from master_items where name = 'Football' and category_id = (select id from master_categories where code = 'SPORTS')),
       'Cust A', '9111111111', '2026-01-15', '10:00', '11:00', 60, 500, 500, 'PHONE', 'CONFIRMED', '${uuid.ownerAUser}'),
      ('REF-B-001', '30000000-0000-0000-0000-00000000000b', '40000000-0000-0000-0000-00000000000b',
       (select id from master_items where name = 'Football' and category_id = (select id from master_categories where code = 'SPORTS')),
       'Cust B', '9222222222', '2026-01-15', '12:00', '13:00', 60, 600, 600, 'IN_PERSON', 'CONFIRMED', '${uuid.ownerBUser}');
  `);
  console.log('  OK    fixtures inserted');

  // --- Booking double-booking prevention ---------------------------------------
  console.log('\nBooking double-booking prevention (service role):');

  await db.exec(`
    insert into bookings
      (booking_reference, turf_id, court_id, sport_id, customer_name, customer_phone,
       booking_date, start_time, end_time, duration_minutes, base_amount, total_amount,
       booking_source, booking_status, created_by)
    values
      ('REF-A-002', '30000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-00000000000a',
       (select id from master_items where name = 'Football' and category_id = (select id from master_categories where code = 'SPORTS')),
       'Cust A', '9111111111', '2026-01-15', '10:30', '11:30', 60, 500, 500, 'PHONE', 'CONFIRMED', '${uuid.ownerAUser}')
  `).then(
    () => check('overlapping CONFIRMED booking rejected', false, 'insert unexpectedly succeeded'),
    (err) => check('overlapping CONFIRMED booking rejected', /uq_booking_no_active_overlap/.test(err.message), err.message),
  );

  await db.exec(`
    insert into bookings
      (booking_reference, turf_id, court_id, sport_id, customer_name, customer_phone,
       booking_date, start_time, end_time, duration_minutes, base_amount, total_amount,
       booking_source, booking_status, created_by)
    values
      ('REF-A-003', '30000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-00000000000a',
       (select id from master_items where name = 'Football' and category_id = (select id from master_categories where code = 'SPORTS')),
       'Cust A', '9111111111', '2026-01-15', '11:00', '12:00', 60, 500, 500, 'PHONE', 'CONFIRMED', '${uuid.ownerAUser}')
  `).then(
    () => check('adjacent CONFIRMED booking allowed', true),
    (err) => check('adjacent CONFIRMED booking allowed', false, err.message),
  );

  // Cancelled bookings do not block the slot.
  await db.exec(`
    insert into bookings
      (booking_reference, turf_id, court_id, sport_id, customer_name, customer_phone,
       booking_date, start_time, end_time, duration_minutes, base_amount, total_amount,
       booking_source, booking_status, cancellation_reason, cancelled_at, created_by)
    values
      ('REF-A-004', '30000000-0000-0000-0000-00000000000a', '40000000-0000-0000-0000-00000000000a',
       (select id from master_items where name = 'Football' and category_id = (select id from master_categories where code = 'SPORTS')),
       'Cust A', '9111111111', '2026-01-15', '10:30', '11:30', 60, 500, 500, 'PHONE', 'CANCELLED',
       'customer request', now(), '${uuid.ownerAUser}')
  `).then(
    () => check('CANCELLED booking overlapping an active booking allowed', true),
    (err) => check('CANCELLED booking overlapping an active booking allowed', false, err.message),
  );

  // Rejection requires a reason (check constraint). Turf A is APPROVED+ACTIVE;
  // deactivate it first so only the rejection check can fire.
  await db.exec(`
    update turfs set status = 'INACTIVE' where id = '30000000-0000-0000-0000-00000000000a'
  `);
  await db.exec(`
    update turfs set approval_status = 'REJECTED' where id = '30000000-0000-0000-0000-00000000000a'
  `).then(
    () => check('rejection without reason rejected by DB', false, 'update unexpectedly succeeded'),
    (err) => check('rejection without reason rejected by DB', /chk_rejection_requires_reason/.test(err.message), err.message),
  );

  // Cannot activate an unapproved turf (check constraint). Turf B is
  // APPROVED+ACTIVE; move it to INACTIVE/DRAFT, then try to activate.
  await db.exec(`
    update turfs set status = 'INACTIVE' where id = '30000000-0000-0000-0000-00000000000b';
    update turfs set approval_status = 'DRAFT' where id = '30000000-0000-0000-0000-00000000000b';
  `);
  await db.exec(`
    update turfs set status = 'ACTIVE' where id = '30000000-0000-0000-0000-00000000000b'
  `).then(
    () => check('activate unapproved turf rejected by DB', false, 'update unexpectedly succeeded'),
    (err) => check('activate unapproved turf rejected by DB', /chk_active_requires_approval/.test(err.message), err.message),
  );

  // --- RLS behavior -------------------------------------------------------------
  console.log('\nRLS behavior:');

  async function impersonate(uid) {
    await db.exec(`set role authenticated`);
    await db.exec(`select set_config('app.uid', '${uid}', false)`);
  }
  async function restoreServiceRole() {
    await db.exec(`reset role`);
  }

  await impersonate(uuid.ownerAUser);
  {
    const { rows } = await db.query(`select name from turfs order by name`);
    check('owner A sees only own turfs', rows.length === 1 && rows[0].name === 'Turf A');

    const { rows: b } = await db.query(`select booking_reference from bookings order by booking_reference`);
    const ownerAReqs = b.map((r) => r.booking_reference);
    check(
      'owner A sees only own bookings',
      ownerAReqs.length >= 1 && ownerAReqs.includes('REF-A-001') && !ownerAReqs.includes('REF-B-001'),
    );

    const { rows: audit } = await db.query(`select * from audit_logs`);
    check('owner cannot read audit_logs', audit.length === 0);

    const { rows: notif } = await db.query(`select * from notifications where user_id = '${uuid.ownerBUser}'`);
    check('owner cannot read another user notifications', notif.length === 0);

    const { rows: hacked } = await db.query(
      `update turfs set name = 'HACKED' where id = '30000000-0000-0000-0000-00000000000b' returning id`,
    );
    check('owner A cannot update owner B turf', hacked.length === 0);

    await db.exec(`insert into notifications (user_id, type, title, message) values ('${uuid.ownerAUser}', 'TEST', 't', 'm')`).then(
      () => check('owner cannot insert notifications directly (no insert policy)', false, 'insert unexpectedly succeeded'),
      (err) => check('owner cannot insert notifications directly (no insert policy)', /row-level security policy|permission denied/.test(err.message), err.message),
    );
  }
  await restoreServiceRole();

  await impersonate(uuid.ownerBUser);
  {
    const { rows } = await db.query(`select name from turfs`);
    check('owner B sees only own turfs', rows.length === 1 && rows[0].name === 'Turf B');
  }
  await restoreServiceRole();

  await impersonate(uuid.adminUser);
  {
    const { rows } = await db.query(`select name from turfs order by name`);
    check('admin sees all turfs', rows.length === 2);

    const { rows: audit } = await db.query(`select * from audit_logs`);
    check('admin can read audit_logs', Array.isArray(audit));

    const { rows: b } = await db.query(`select booking_reference from bookings order by booking_reference`);
    check('admin sees all bookings', b.length >= 2);
  }
  await restoreServiceRole();

  // --- Summary --------------------------------------------------------------------
  console.log(`\n${'='.repeat(60)}`);
  console.log(`PASSED: ${passed}   FAILED: ${failed}`);
  if (failures.length) {
    console.log(`FAILURES: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log('All migration checks passed.');
  await db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
