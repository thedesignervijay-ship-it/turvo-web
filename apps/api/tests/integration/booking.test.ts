import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestContext,
  authHeader,
  type TestContext,
} from '../helpers/testClient.js';
import type { TestDatabase } from '../helpers/testDb.js';
import { createTestDatabase } from '../helpers/testDb.js';
import {
  seedUsers,
  seedMasterItems,
  seedApprovedTurf,
  futureDate,
  nextDateWithDow,
  UUID,
} from '../helpers/fixtures.js';

describe('bookings', () => {
  let tdb: TestDatabase;
  let ctx: TestContext;
  let ownerAuth: { Authorization: string };
  let otherOwnerAuth: { Authorization: string };
  let adminAuth: { Authorization: string };
  let turfId: string;
  let courtId: string;
  let sportId: string;
  let bookingDate: string;

  const bookingBody = () => ({
    courtId,
    bookingDate,
    startTime: '07:00',
    endTime: '08:00',
    customerName: 'Ravi Kumar',
    customerPhone: '9876543210',
    bookingSource: 'PHONE',
  });

  beforeAll(async () => {
    tdb = await createTestDatabase();
    ctx = createTestContext(tdb.db);
    await seedUsers(tdb.db);
    await seedMasterItems(tdb.db);
    ownerAuth = await authHeader(UUID.ownerAUser);
    otherOwnerAuth = await authHeader(UUID.ownerBUser);
    adminAuth = await authHeader(UUID.adminUser);

    const seeded = await seedApprovedTurf(tdb.db, { turfId: UUID.turfA, ownerId: UUID.ownerA });
    turfId = seeded.turfId;
    courtId = seeded.courtId;
    sportId = seeded.sportId;
    bookingDate = nextDateWithDow(1);
  });

  afterAll(async () => {
    await tdb.pg.close();
  });

  it('creates a manual booking and computes the price from the active rule', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send(bookingBody());
    expect(res.status).toBe(201);
    expect(res.body.data.bookingStatus).toBe('CONFIRMED');
    expect(res.body.data.bookingReference).toMatch(/^BK-/);
    expect(res.body.data.baseAmount).toBe(500);
    expect(res.body.data.totalAmount).toBe(500);
    expect(res.body.data.durationMinutes).toBe(60);
    expect(res.body.data.bookingDate).toBe(bookingDate);
    expect(res.body.data.courtId).toBe(courtId);
    expect(res.body.data.sportId).toBe(sportId);
  });

  it('applies a discount and validates it', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({ ...bookingBody(), startTime: '08:00', endTime: '09:00', discountAmount: 100 });
    expect(res.status).toBe(201);
    expect(res.body.data.baseAmount).toBe(500);
    expect(res.body.data.discountAmount).toBe(100);
    expect(res.body.data.totalAmount).toBe(400);
  });

  it('rejects a discount greater than the base amount', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({ ...bookingBody(), startTime: '09:00', endTime: '10:00', discountAmount: 600 });
    expect(res.status).toBe(422);
  });

  it('rejects overlapping active bookings for the same court', async () => {
    await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({ ...bookingBody(), startTime: '10:00', endTime: '11:00' });
    const res = await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({ ...bookingBody(), startTime: '10:30', endTime: '11:30' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BOOKING_CONFLICT');
  });

  it('allows a non-overlapping booking on the same court', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({ ...bookingBody(), startTime: '11:00', endTime: '12:00' });
    expect(res.status).toBe(201);
  });

  it('rejects bookings outside operating hours', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({ ...bookingBody(), startTime: '05:00', endTime: '06:00' });
    expect(res.status).toBe(422);
  });

  it('rejects bookings for a blocked slot', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/availability-blocks`)
      .set(ownerAuth)
      .send({
        courtId,
        startDateTime: `${bookingDate}T12:00:00+05:30`,
        endDateTime: `${bookingDate}T13:00:00+05:30`,
        blockType: 'MAINTENANCE',
        reason: 'Court repair',
      });
    expect(res.status).toBe(201);
    const blocked = await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({ ...bookingBody(), startTime: '12:00', endTime: '13:00' });
    expect(blocked.status).toBe(422);
  });

  it('rejects a booking in the past', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({ ...bookingBody(), bookingDate: futureDate(-2) });
    expect(res.status).toBe(422);
  });

  it('forbids a non-owner from creating bookings for another turf', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/bookings')
      .set(otherOwnerAuth)
      .send(bookingBody());
    expect(res.status).toBe(404);
  });

  it('rejects an unapproved turf', async () => {
    const turf = await seedApprovedTurf(tdb.db, { turfId: UUID.turfB, ownerId: UUID.ownerA });
    await tdb.db.query(`update turfs set status = 'INACTIVE' where id = $1`, [turf.turfId]);
    await tdb.db.query(`update turfs set approval_status = 'SUBMITTED' where id = $1`, [turf.turfId]);
    const res = await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({ ...bookingBody(), courtId: turf.courtId, bookingDate: futureDate(3) });
    expect(res.status).toBe(422);
  });

  it('lists bookings with filters as the owner', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/bookings?status=CONFIRMED&page=1&limit=10')
      .set(ownerAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.rows.length).toBeGreaterThan(0);
    expect(res.body.data.rows.every((b: { bookingStatus: string }) => b.bookingStatus === 'CONFIRMED')).toBe(true);
  });

  it('lets an admin list all bookings', async () => {
    const res = await request(ctx.app).get('/api/v1/bookings?limit=10').set(adminAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.rows.length).toBeGreaterThan(0);
  });

  it('filters the admin booking list by court', async () => {
    const res = await request(ctx.app).get(`/api/v1/bookings?courtId=${courtId}&limit=10`).set(adminAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.rows.length).toBeGreaterThan(0);
    expect(res.body.data.rows.every((b: { courtId: string }) => b.courtId === courtId)).toBe(true);

    const none = await request(ctx.app)
      .get(`/api/v1/bookings?courtId=00000000-0000-4000-8000-0000000000ff&limit=10`)
      .set(adminAuth);
    expect(none.status).toBe(200);
    expect(none.body.data.rows).toHaveLength(0);
  });

  it('returns a single booking by id', async () => {
    const list = await request(ctx.app).get('/api/v1/bookings?limit=1').set(ownerAuth);
    const id = list.body.data.rows[0].id;
    const res = await request(ctx.app).get(`/api/v1/bookings/${id}`).set(ownerAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  it('hides another owners booking', async () => {
    const list = await request(ctx.app).get('/api/v1/bookings?limit=1').set(ownerAuth);
    const id = list.body.data.rows[0].id;
    const res = await request(ctx.app).get(`/api/v1/bookings/${id}`).set(otherOwnerAuth);
    expect(res.status).toBe(404);
  });

  it('completes a confirmed booking', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({ ...bookingBody(), startTime: '14:00', endTime: '15:00' });
    const id = res.body.data.id;
    const done = await request(ctx.app).post(`/api/v1/bookings/${id}/complete`).set(ownerAuth);
    expect(done.status).toBe(200);
    expect(done.body.data.bookingStatus).toBe('COMPLETED');
    expect(done.body.data.completedAt).toBeTruthy();
  });

  it('cancels a confirmed booking and requires a reason', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({ ...bookingBody(), startTime: '15:00', endTime: '16:00' });
    const id = res.body.data.id;

    const noReason = await request(ctx.app).post(`/api/v1/bookings/${id}/cancel`).set(ownerAuth).send({});
    expect(noReason.status).toBe(422);

    const done = await request(ctx.app)
      .post(`/api/v1/bookings/${id}/cancel`)
      .set(ownerAuth)
      .send({ reason: 'Customer cancelled' });
    expect(done.status).toBe(200);
    expect(done.body.data.bookingStatus).toBe('CANCELLED');
    expect(done.body.data.cancellationReason).toBe('Customer cancelled');
    expect(done.body.data.cancelledAt).toBeTruthy();
  });

  it('frees the slot after cancellation', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({ ...bookingBody(), startTime: '16:00', endTime: '17:00' });
    const id = res.body.data.id;
    await request(ctx.app)
      .post(`/api/v1/bookings/${id}/cancel`)
      .set(ownerAuth)
      .send({ reason: 'Customer cancelled' });
    const again = await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({ ...bookingBody(), startTime: '16:00', endTime: '17:00' });
    expect(again.status).toBe(201);
  });

  it('rejects cancelling or completing a completed booking', async () => {
    const res = await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({ ...bookingBody(), startTime: '18:00', endTime: '19:00' });
    const id = res.body.data.id;
    await request(ctx.app).post(`/api/v1/bookings/${id}/complete`).set(ownerAuth);
    const cancel = await request(ctx.app)
      .post(`/api/v1/bookings/${id}/cancel`)
      .set(ownerAuth)
      .send({ reason: 'nope' });
    expect(cancel.status).toBe(422);
  });

  it('returns owner dashboard counts', async () => {
    const res = await request(ctx.app).get('/api/v1/bookings/dashboard').set(ownerAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.today).toBeGreaterThanOrEqual(0);
    expect(res.body.data.month).toBeGreaterThanOrEqual(0);
    expect(res.body.data.completed).toBeGreaterThanOrEqual(0);
    expect(res.body.data.cancelled).toBeGreaterThanOrEqual(0);
  });

  it('allows exactly one of two concurrent bookings for the same slot', async () => {
    const body = { ...bookingBody(), startTime: '19:00', endTime: '20:00' };
    const [a, b] = await Promise.allSettled([
      request(ctx.app).post('/api/v1/bookings').set(ownerAuth).send(body),
      request(ctx.app).post('/api/v1/bookings').set(ownerAuth).send(body),
    ]);
    const statuses = [a, b].map((r) => (r.status === 'fulfilled' ? r.value.status : 500));
    const bodies = [a, b].map((r) => (r.status === 'fulfilled' ? r.value.body : {}));
    const created = statuses.filter((s) => s === 201).length;
    const conflicted = statuses.filter((s) => s === 409).length;
    expect(created).toBe(1);
    expect(conflicted).toBe(1);
    expect(bodies).toContainEqual(expect.objectContaining({ success: true }));
    expect(bodies.some((b_) => b_.error?.code === 'BOOKING_CONFLICT')).toBe(true);
  });
});
