#!/usr/bin/env node
/**
 * Turvo Seed Script
 *
 * Creates realistic demo data via the API and direct DB inserts:
 * - 3 owners with turfs, courts, operating hours, pricing
 * - ~30 bookings across past/present/future dates
 * - Notifications for the admin
 *
 * Usage:  node scripts/seed.mjs
 * Requires: API running on http://localhost:4000
 */

import { createHmac } from 'node:crypto';
import { Client } from 'pg';

const API = 'http://localhost:4000/api/v1';
const JWT_SECRET = '5ff97b3a-15b2-4a20-8eea-dcd90137374c';
const DATABASE_URL = 'postgresql://postgres.ullmiqqaqvinteiaswxm:TurvoTest123!1@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

// ── JWT helper ──

function makeToken(sub) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    sub,
    role: 'authenticated',
    aud: 'authenticated',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7200,
  })).toString('base64url');
  const sig = createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

// ── HTTP helper ──

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  });
  const body = await res.json();
  if (!res.ok) {
    const msg = body?.error?.message || body?.message || JSON.stringify(body);
    throw new Error(`${res.status} ${path}: ${msg}`);
  }
  return body;
}

// ── Date helpers ──

function today() { return new Date().toISOString().slice(0, 10); }

function dateOff(days) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function dayOfWeek(daysOffset) {
  return new Date(Date.now() + daysOffset * 86400000).getDay();
}

// ── Seed data ──

const OWNERS = [
  { name: 'Rajesh Kumar', email: 'rajesh@turvo.com', password: 'Owner123!', phone: '9876543210',
    businessName: 'Kumar Sports Arena', businessPhone: '9876543211', businessEmail: 'info@kumarsports.com',
    addressLine1: '12 MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
  { name: 'Priya Sharma', email: 'priya@turvo.com', password: 'Owner123!', phone: '9876543220',
    businessName: 'Sharma Tennis & Badminton', businessPhone: '9876543221', businessEmail: 'info@sharmasports.com',
    addressLine1: '45 Park Street', city: 'Mumbai', state: 'Maharashtra', pincode: '400002' },
  { name: 'Amit Patel', email: 'amit@turvo.com', password: 'Owner123!', phone: '9876543230',
    businessName: 'Patel Multi Sports', businessPhone: '9876543231', businessEmail: 'info@patelsports.com',
    addressLine1: '78 Nehru Nagar', city: 'Pune', state: 'Maharashtra', pincode: '411001' },
];

const TURFS = [
  { owner: 0, name: 'Kumar Cricket Ground', desc: 'Premium cricket ground with floodlights.', addr: '12 MG Road', city: 'Mumbai', state: 'Maharashtra', pin: '400001', phone: '9876543211', sports: ['Cricket', 'Football'] },
  { owner: 0, name: 'Kumar Football Turf', desc: 'FIFA-standard artificial turf.', addr: '14 MG Road', city: 'Mumbai', state: 'Maharashtra', pin: '400001', phone: '9876543212', sports: ['Football'] },
  { owner: 1, name: 'Sharma Badminton Courts', desc: 'Indoor badminton with international-grade flooring.', addr: '45 Park Street', city: 'Mumbai', state: 'Maharashtra', pin: '400002', phone: '9876543221', sports: ['Badminton'] },
  { owner: 1, name: 'Sharma Tennis Academy', desc: 'Clay and hard court tennis facility.', addr: '47 Park Street', city: 'Mumbai', state: 'Maharashtra', pin: '400002', phone: '9876543222', sports: ['Tennis'] },
  { owner: 2, name: 'Patel Basketball Court', desc: 'Outdoor basketball court.', addr: '78 Nehru Nagar', city: 'Pune', state: 'Maharashtra', pin: '411001', phone: '9876543231', sports: ['Basketball'] },
  { owner: 2, name: 'Patel Volleyball Arena', desc: 'Beach and indoor volleyball courts.', addr: '80 Nehru Nagar', city: 'Pune', state: 'Maharashtra', pin: '411002', phone: '9876543232', sports: ['Volleyball'] },
];

const COURT_DEFS = [
  { turf: 0, courts: [{ name: 'Pitch A', sport: 'Cricket' }, { name: 'Pitch B', sport: 'Cricket' }, { name: 'Field 1', sport: 'Football' }] },
  { turf: 1, courts: [{ name: 'Main Field', sport: 'Football' }, { name: 'Training Field', sport: 'Football' }] },
  { turf: 2, courts: [{ name: 'Court 1', sport: 'Badminton' }, { name: 'Court 2', sport: 'Badminton' }, { name: 'Court 3', sport: 'Badminton' }] },
  { turf: 3, courts: [{ name: 'Clay Court', sport: 'Tennis' }, { name: 'Hard Court', sport: 'Tennis' }] },
  { turf: 4, courts: [{ name: 'Court A', sport: 'Basketball' }, { name: 'Court B', sport: 'Basketball' }] },
  { turf: 5, courts: [{ name: 'Indoor Court', sport: 'Volleyball' }, { name: 'Beach Court', sport: 'Volleyball' }] },
];

const PRICING = [
  { turf: 0, weekday: 1500, weekend: 2000 },
  { turf: 1, weekday: 1200, weekend: 1800 },
  { turf: 2, weekday: 800, weekend: 1200 },
  { turf: 3, weekday: 1000, weekend: 1500 },
  { turf: 4, weekday: 700, weekend: 1000 },
  { turf: 5, weekday: 600, weekend: 900 },
];

const CUSTOMERS = [
  { name: 'Vikram Singh', phone: '9000000001' },
  { name: 'Neha Gupta', phone: '9000000002' },
  { name: 'Suresh Reddy', phone: '9000000003' },
  { name: 'Anita Desai', phone: '9000000004' },
  { name: 'Rahul Joshi', phone: '9000000005' },
  { name: 'Pooja Nair', phone: '9000000006' },
  { name: 'Karan Mehta', phone: '9000000007' },
  { name: 'Deepa Iyer', phone: '9000000008' },
  { name: 'Arjun Rao', phone: '9000000009' },
  { name: 'Meera Kulkarni', phone: '9000000010' },
];

// Future bookings: [turfIdx, courtIndexWithinTurf, dayOffset, start, end, customerIdx, source]
const FUTURE_BOOKINGS = [
  [0, 0, 1, '07:00', '08:00', 0, 'PHONE'],
  [0, 1, 1, '08:00', '09:00', 1, 'IN_PERSON'],
  [2, 0, 1, '07:00', '08:00', 2, 'PHONE'],
  [3, 0, 1, '09:00', '10:00', 3, 'IN_PERSON'],
  [4, 0, 1, '06:00', '07:00', 4, 'PHONE'],
  [0, 0, 2, '10:00', '11:00', 5, 'IN_PERSON'],
  [1, 0, 2, '07:00', '08:00', 6, 'PHONE'],
  [2, 1, 2, '08:00', '09:00', 7, 'IN_PERSON'],
  [5, 0, 2, '17:00', '18:00', 8, 'PHONE'],
  [0, 2, 3, '16:00', '17:00', 9, 'IN_PERSON'],
  [3, 1, 3, '18:00', '19:00', 0, 'PHONE'],
  [4, 1, 3, '07:00', '08:00', 1, 'IN_PERSON'],
  [1, 0, 4, '09:00', '10:00', 2, 'PHONE'],
  [5, 1, 4, '06:00', '07:00', 3, 'IN_PERSON'],
  [2, 2, 5, '14:00', '15:00', 4, 'PHONE'],
];

// Past bookings: [turfIdx, courtIndexWithinTurf, dayOffset, start, end, customerIdx, status, source]
const PAST_BOOKINGS = [
  [0, 0, -1, '07:00', '08:00', 0, 'COMPLETED', 'PHONE'],
  [0, 1, -1, '09:00', '10:00', 1, 'COMPLETED', 'IN_PERSON'],
  [2, 0, -1, '07:00', '08:00', 2, 'COMPLETED', 'PHONE'],
  [2, 1, -1, '10:00', '11:00', 3, 'CANCELLED', 'IN_PERSON'],
  [4, 0, -1, '16:00', '17:00', 4, 'COMPLETED', 'PHONE'],
  [0, 0, -2, '08:00', '09:00', 5, 'COMPLETED', 'IN_PERSON'],
  [1, 0, -2, '07:00', '08:00', 6, 'COMPLETED', 'PHONE'],
  [3, 0, -2, '09:00', '10:00', 7, 'CANCELLED', 'IN_PERSON'],
  [2, 0, -2, '14:00', '15:00', 8, 'COMPLETED', 'PHONE'],
  [5, 0, -2, '17:00', '18:00', 9, 'COMPLETED', 'IN_PERSON'],
  [0, 2, -3, '06:00', '07:00', 0, 'COMPLETED', 'PHONE'],
  [2, 2, -3, '08:00', '09:00', 1, 'COMPLETED', 'IN_PERSON'],
  [4, 1, -3, '15:00', '16:00', 2, 'CANCELLED', 'PHONE'],
  [1, 1, -3, '18:00', '19:00', 3, 'COMPLETED', 'IN_PERSON'],
  [0, 0, -4, '07:00', '08:00', 4, 'COMPLETED', 'PHONE'],
  [3, 1, -4, '10:00', '11:00', 5, 'COMPLETED', 'IN_PERSON'],
  [2, 0, -5, '16:00', '17:00', 6, 'COMPLETED', 'PHONE'],
  [5, 1, -5, '07:00', '08:00', 7, 'CANCELLED', 'IN_PERSON'],
  [0, 1, -5, '09:00', '10:00', 8, 'COMPLETED', 'PHONE'],
  [4, 0, -5, '14:00', '15:00', 9, 'COMPLETED', 'IN_PERSON'],
];

// ── State tracking ──

const ownerState = [];   // [{ authUserId, userId, ownerId, token, email }]
const turfState = [];    // [{ id, name, ownerIdx, token }]
const courtState = [];   // [{ id, turfIdx, sportId, name }]
let adminToken = null;

function log(msg) { process.stdout.write(msg); }
function logLn(msg) { console.log(msg); }

function makeRef() {
  const c = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let r = '';
  for (let i = 0; i < 8; i++) r += c[Math.floor(Math.random() * c.length)];
  return `BK-${r}`;
}

// ── DB helper ──

let db;
async function dbQuery(sql, params = []) {
  if (!db) {
    db = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
    await db.connect();
  }
  return db.query(sql, params);
}

// ── Main ──

async function main() {
  console.log('🌱 Starting Turvo seed...\n');

  // ─────────── 1. Register owners ───────────
  logLn('📋 Creating owner accounts...');
  for (const o of OWNERS) {
    try {
      const res = await api('/auth/register', { method: 'POST', body: JSON.stringify(o) });
      const authUserId = res.data.user.authUserId;
      const token = makeToken(authUserId);
      ownerState.push({ authUserId, userId: res.data.user.id, ownerId: res.data.owner.id, token, email: o.email });
      logLn(`  ✅ ${o.name} (${o.email})`);
    } catch (err) {
      if (err.message.includes('already') || err.message.includes('409')) {
        // Already registered — look up via DB
        const r = await dbQuery(`SELECT id, auth_user_id FROM public.users WHERE email = $1`, [o.email]);
        if (r.rows.length) {
          const authUserId = r.rows[0].auth_user_id;
          const token = makeToken(authUserId);
          const oRow = await dbQuery(`SELECT id FROM public.turf_owners WHERE user_id = $1`, [r.rows[0].id]);
          ownerState.push({ authUserId, userId: r.rows[0].id, ownerId: oRow.rows[0]?.id, token, email: o.email });
          logLn(`  ⏭️  ${o.name} (already exists)`);
        }
      } else {
        logLn(`  ❌ ${o.name}: ${err.message}`);
      }
    }
  }
  logLn(`  → ${ownerState.length} owners ready\n`);

  // ─────────── 2. Get admin token ───────────
  const adminRow = await dbQuery(`SELECT auth_user_id FROM public.users WHERE email = 'admin@turvo.com'`);
  if (adminRow.rows.length) {
    adminToken = makeToken(adminRow.rows[0].auth_user_id);
    logLn('🔑 Admin token ready');
  } else {
    logLn('❌ No admin user found!');
    process.exit(1);
  }

  // ─────────── 3. Fetch master sport IDs ───────────
  logLn('🏟️  Fetching master sports...');
  const sportMap = {};
  // Use admin token to query master data (owners don't have master-data.read)
  const items = await api('/master-data/items?category=SPORTS&limit=50', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  for (const row of items.data?.rows || []) {
    sportMap[row.name] = row.id;
  }
  logLn(`  → Found: ${Object.keys(sportMap).join(', ')}\n`);

  // ─────────── 4. Create turfs ───────────
  logLn('🏗️  Creating turfs...');
  for (const t of TURFS) {
    const owner = ownerState[t.owner];
    if (!owner) { logLn(`  ⏭️  ${t.name} (no owner)`); continue; }
    const sportIds = t.sports.map(s => sportMap[s]).filter(Boolean);
    try {
      const res = await api('/turfs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${owner.token}` },
        body: JSON.stringify({
          name: t.name,
          description: t.desc,
          addressLine1: t.addr,
          city: t.city,
          state: t.state,
          pincode: t.pin,
          contactPhone: t.phone,
          slotDurationMinutes: 60,
          sportIds,
        }),
      });
      const turf = res.data;
      turfState.push({ id: turf.id, name: turf.name, ownerIdx: t.owner, token: owner.token });
      logLn(`  ✅ ${t.name}`);
    } catch (err) {
      logLn(`  ❌ ${t.name}: ${err.message}`);
    }
  }
  logLn(`  → ${turfState.length} turfs created\n`);

  // ─────────── 5. Create courts ───────────
  logLn('🎾 Creating courts...');
  for (const cd of COURT_DEFS) {
    const turfEntry = turfState.find(t => t.name === TURFS[cd.turf].name);
    if (!turfEntry) { logLn(`  ⏭️  Courts for ${TURFS[cd.turf].name} (no turf)`); continue; }
    for (const c of cd.courts) {
      const sportId = sportMap[c.sport];
      try {
        const res = await api(`/turfs/${turfEntry.id}/courts`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${turfEntry.token}` },
          body: JSON.stringify({ sportId, name: c.name, capacity: 20 }),
        });
        courtState.push({ id: res.data.id, turfIdx: cd.turf, sportId, name: c.name });
        logLn(`  ✅ ${TURFS[cd.turf].name} → ${c.name}`);
      } catch (err) {
        logLn(`  ❌ ${c.name}: ${err.message}`);
      }
    }
  }
  logLn(`  → ${courtState.length} courts created\n`);

  // ─────────── 6. Set operating hours (6 AM – 10 PM, every day) ───────────
  logLn('🕐 Setting operating hours...');
  for (const t of turfState) {
    try {
      await api(`/turfs/${t.id}/operating-hours`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${t.token}` },
        body: JSON.stringify({
          days: Array.from({ length: 7 }, (_, i) => ({
            dayOfWeek: i, openingTime: '06:00', closingTime: '22:00', isClosed: false,
          })),
        }),
      });
      logLn(`  ✅ ${t.name}`);
    } catch (err) {
      logLn(`  ❌ ${t.name}: ${err.message}`);
    }
  }
  logLn('');

  // ─────────── 7. Set pricing rules ───────────
  logLn('💰 Setting pricing...');
  for (const p of PRICING) {
    const turfEntry = turfState.find(t => t.name === TURFS[p.turf].name);
    if (!turfEntry) continue;
    for (const dayType of ['WEEKDAY', 'WEEKEND']) {
      const price = dayType === 'WEEKDAY' ? p.weekday : p.weekend;
      try {
        await api(`/turfs/${turfEntry.id}/pricing`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${turfEntry.token}` },
          body: JSON.stringify({
            startTime: '06:00', endTime: '22:00',
            dayType, price, currency: 'INR', effectiveFrom: today(),
          }),
        });
        logLn(`  ✅ ${turfEntry.name} ${dayType}: ₹${price}/hr`);
      } catch (err) {
        logLn(`  ❌ ${turfEntry.name} ${dayType}: ${err.message}`);
      }
    }
  }
  logLn('');

  // ─────────── 8. Submit turfs ───────────
  logLn('📝 Submitting turfs for review...');
  for (const t of turfState) {
    try {
      await api(`/turfs/${t.id}/submit`, {
        method: 'POST', headers: { Authorization: `Bearer ${t.token}` },
      });
      logLn(`  ✅ ${t.name}`);
    } catch (err) {
      logLn(`  ❌ ${t.name}: ${err.message}`);
    }
  }
  logLn('');

  // ─────────── 9. Approve turfs (admin) ───────────
  logLn('👍 Admin approving turfs...');
  for (const t of turfState) {
    try {
      await api(`/turfs/${t.id}/approve`, {
        method: 'POST', headers: { Authorization: `Bearer ${adminToken}` },
      });
      logLn(`  ✅ ${t.name}`);
    } catch (err) {
      logLn(`  ❌ ${t.name}: ${err.message}`);
    }
  }
  logLn('');

  // ─────────── 10. Activate turfs (admin) ───────────
  logLn('⚡ Activating turfs...');
  for (const t of turfState) {
    try {
      await api(`/turfs/${t.id}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      logLn(`  ✅ ${t.name}`);
    } catch (err) {
      logLn(`  ❌ ${t.name}: ${err.message}`);
    }
  }
  logLn('');

  // ─────────── 11. Create future bookings via API ───────────
  logLn('📅 Creating future bookings...');
  let futureCount = 0;
  for (const [turfIdx, courtIdx, dayOff, start, end, custIdx, source] of FUTURE_BOOKINGS) {
    const turfEntry = turfState.find(t => t.name === TURFS[turfIdx].name);
    if (!turfEntry) continue;
    const courts = courtState.filter(c => c.turfIdx === turfIdx);
    const court = courts[courtIdx];
    if (!court) continue;
    const cust = CUSTOMERS[custIdx];
    try {
      await api('/bookings', {
        method: 'POST',
        headers: { Authorization: `Bearer ${turfEntry.token}` },
        body: JSON.stringify({
          courtId: court.id,
          bookingDate: dateOff(dayOff),
          startTime: start,
          endTime: end,
          customerName: cust.name,
          customerPhone: cust.phone,
          bookingSource: source,
          discountAmount: 0,
        }),
      });
      futureCount++;
      logLn(`  ✅ ${TURFS[turfIdx].name} ${dateOff(dayOff)} ${start}-${end} (${cust.name})`);
    } catch (err) {
      logLn(`  ❌ ${cust.name}: ${err.message}`);
    }
  }
  logLn(`  → ${futureCount} future bookings\n`);

  // ─────────── 12. Create past bookings via DB ───────────
  logLn('📚 Creating past bookings (DB direct)...');
  let pastCount = 0;
  for (const [turfIdx, courtIdx, dayOff, start, end, custIdx, status, source] of PAST_BOOKINGS) {
    const turfEntry = turfState.find(t => t.name === TURFS[turfIdx].name);
    if (!turfEntry) continue;
    const courts = courtState.filter(c => c.turfIdx === turfIdx);
    const court = courts[courtIdx];
    if (!court) continue;
    const cust = CUSTOMERS[custIdx];
    const owner = ownerState[TURFS[turfIdx].owner];
    const price = PRICING.find(p => p.turf === turfIdx)?.weekday || 800;
    const ref = makeRef();
    const bdate = dateOff(dayOff);

    try {
      if (status === 'COMPLETED') {
        await dbQuery(
          `INSERT INTO public.bookings
            (id, booking_reference, turf_id, court_id, sport_id, customer_name, customer_phone,
             booking_date, start_time, end_time, duration_minutes, base_amount, discount_amount, total_amount,
             booking_source, booking_status, completed_at, created_by, created_at, updated_at)
           VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,60,$10,0,$10,$11,'COMPLETED',NOW(),$12,NOW(),NOW())`,
          [ref, turfEntry.id, court.id, court.sportId, cust.name, cust.phone, bdate, start, end, price, source, owner.userId]
        );
      } else {
        await dbQuery(
          `INSERT INTO public.bookings
            (id, booking_reference, turf_id, court_id, sport_id, customer_name, customer_phone,
             booking_date, start_time, end_time, duration_minutes, base_amount, discount_amount, total_amount,
             booking_source, booking_status, cancellation_reason, cancelled_at, created_by, created_at, updated_at)
           VALUES (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9,60,$10,0,$10,$11,'CANCELLED','Customer request',NOW(),$12,NOW(),NOW())`,
          [ref, turfEntry.id, court.id, court.sportId, cust.name, cust.phone, bdate, start, end, price, source, owner.userId]
        );
      }
      pastCount++;
      logLn(`  ✅ ${status} ${TURFS[turfIdx].name} ${bdate} ${start}-${end} (${cust.name})`);
    } catch (err) {
      logLn(`  ❌ ${cust.name}: ${err.message}`);
    }
  }
  logLn(`  → ${pastCount} past bookings\n`);

  // ─────────── 13. Create notifications ───────────
  logLn('🔔 Creating notifications...');
  try {
    const adminUserId = (await dbQuery(`SELECT id FROM public.users WHERE email = 'admin@turvo.com'`)).rows[0].id;
    const notifs = [
      ['OWNER_REGISTERED', 'New owner registered', 'Rajesh Kumar registered as a turf owner.'],
      ['OWNER_REGISTERED', 'New owner registered', 'Priya Sharma registered as a turf owner.'],
      ['OWNER_REGISTERED', 'New owner registered', 'Amit Patel registered as a turf owner.'],
      ['TURF_SUBMITTED', 'Turf submitted', 'Kumar Cricket Ground submitted for approval.'],
      ['TURF_SUBMITTED', 'Turf submitted', 'Sharma Badminton Courts submitted for approval.'],
      ['NEW_BOOKING', 'New bookings', 'New bookings created across multiple turfs.'],
    ];
    for (const [type, title, message] of notifs) {
      await dbQuery(
        `INSERT INTO public.notifications (id, user_id, type, title, message, is_read, created_at)
         VALUES (gen_random_uuid(),$1,$2,$3,$4,false,NOW())`,
        [adminUserId, type, title, message],
      );
    }
    logLn(`  ✅ ${notifs.length} notifications`);
  } catch (err) {
    logLn(`  ❌ ${err.message}`);
  }

  // ─────────── Done ───────────
  if (db) await db.end();
  console.log('\n🎉 Seed complete!');
  console.log('Summary:');
  console.log(`  Owners:          ${ownerState.length}`);
  console.log(`  Turfs:           ${turfState.length}`);
  console.log(`  Courts:          ${courtState.length}`);
  console.log(`  Future bookings: ${futureCount}`);
  console.log(`  Past bookings:   ${pastCount}`);
  console.log(`  Total bookings:  ${futureCount + pastCount}`);
}

main().catch(async (err) => {
  console.error('\n❌ Seed failed:', err.message);
  if (db) await db.end();
  process.exit(1);
});
