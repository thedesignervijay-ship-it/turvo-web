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
  nextDateWithDow,
  UUID,
} from '../helpers/fixtures.js';

describe('reports', () => {
  let tdb: TestDatabase;
  let ctx: TestContext;
  let ownerAuth: { Authorization: string };
  let adminAuth: { Authorization: string };
  let turfId: string;
  let courtId: string;
  let bookingDate: string;
  let bookingId: string;

  const createBooking = async (startTime: string, endTime: string, extra: Record<string, unknown> = {}) => {
    return request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({
        courtId,
        bookingDate,
        startTime,
        endTime,
        customerName: 'Ravi Kumar',
        customerPhone: '9876543210',
        bookingSource: 'PHONE',
        ...extra,
      });
  };

  beforeAll(async () => {
    tdb = await createTestDatabase();
    ctx = createTestContext(tdb.db);
    await seedUsers(tdb.db);
    await seedMasterItems(tdb.db);
    ownerAuth = await authHeader(UUID.ownerAUser);
    adminAuth = await authHeader(UUID.adminUser);

    const seeded = await seedApprovedTurf(tdb.db, { turfId: UUID.turfA, ownerId: UUID.ownerA });
    turfId = seeded.turfId;
    courtId = seeded.courtId;
    bookingDate = nextDateWithDow(1);

    const first = await createBooking('07:00', '08:00');
    bookingId = first.body.data.id;
    await createBooking('08:00', '09:00');
    await createBooking('09:00', '10:00', { bookingSource: 'IN_PERSON' });
    const cancelled = await createBooking('10:00', '11:00');
    await request(ctx.app)
      .post(`/api/v1/bookings/${cancelled.body.data.id}/cancel`)
      .set(ownerAuth)
      .send({ reason: 'Customer cancelled' });
  });

  afterAll(async () => {
    await tdb.pg.close();
  });

  it('returns the owner earnings summary', async () => {
    const res = await request(ctx.app).get('/api/v1/reports/earnings-summary').set(ownerAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.todayCount).toBe(0);
    expect(res.body.data.monthCount).toBe(3);
    expect(res.body.data.completedCount).toBe(0);
    expect(res.body.data.cancelledCount).toBe(1);
    expect(res.body.data.cancelledValue).toBe(500);
  });

  it('lists the booking report with filters', async () => {
    const res = await request(ctx.app)
      .get(`/api/v1/reports/booking-report?dateFrom=${bookingDate}&dateTo=${bookingDate}&status=CONFIRMED`)
      .set(ownerAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.rows.every((b: { bookingStatus: string }) => b.bookingStatus === 'CONFIRMED')).toBe(true);
  });

  it('filters the booking report by source', async () => {
    const res = await request(ctx.app)
      .get(`/api/v1/reports/booking-report?bookingSource=IN_PERSON`)
      .set(ownerAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.rows[0].bookingSource).toBe('IN_PERSON');
  });

  it('exports the booking report as CSV', async () => {
    const res = await request(ctx.app)
      .get(`/api/v1/reports/booking-report/export?dateFrom=${bookingDate}&dateTo=${bookingDate}`)
      .set(ownerAuth);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const csv = res.text;
    expect(csv.split('\n').length).toBe(5);
    expect(csv).toContain('booking_reference');
    expect(csv).toContain('Ravi Kumar');
  });

  it('returns the daily summary', async () => {
    const res = await request(ctx.app)
      .get(`/api/v1/reports/daily-summary?dateFrom=${bookingDate}&dateTo=${bookingDate}`)
      .set(ownerAuth);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].count).toBe(3);
    expect(res.body.data[0].value).toBe(1500);
  });

  it('returns the cancellation report', async () => {
    const res = await request(ctx.app).get('/api/v1/reports/cancellations').set(ownerAuth);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].cancellationReason).toBe('Customer cancelled');
  });

  it('lets an admin view the owner and turf reports', async () => {
    const owners = await request(ctx.app).get('/api/v1/reports/owner-report').set(adminAuth);
    expect(owners.status).toBe(200);
    expect(owners.body.data.length).toBeGreaterThan(0);
    expect(owners.body.data[0].bookings).toBeGreaterThan(0);

    const turfs = await request(ctx.app).get('/api/v1/reports/turf-report').set(adminAuth);
    expect(turfs.status).toBe(200);
    expect(turfs.body.data.length).toBeGreaterThan(0);
    expect(turfs.body.data[0].turfName).toBe('Green Turf');
  });

  it('lets an admin filter the booking report by owner', async () => {
    const res = await request(ctx.app)
      .get(`/api/v1/reports/booking-report?ownerId=${UUID.ownerA}`)
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(4);
  });

  it('forbids owners from viewing admin-only reports', async () => {
    const res = await request(ctx.app).get('/api/v1/reports/owner-report').set(ownerAuth);
    expect(res.status).toBe(403);
  });

  it('scopes an owner report to their own turf', async () => {
    const seeded = await seedApprovedTurf(tdb.db, { turfId: UUID.turfB, ownerId: UUID.ownerA });
    await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({
        courtId: seeded.courtId,
        bookingDate,
        startTime: '07:00',
        endTime: '08:00',
        customerName: 'Second Court',
        customerPhone: '9000000000',
        bookingSource: 'PHONE',
      });
    const res = await request(ctx.app).get('/api/v1/reports/booking-report').set(ownerAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(5);
  });

  it('returns booking details from the report', async () => {
    const res = await request(ctx.app).get('/api/v1/reports/booking-report').set(ownerAuth);
    const row = res.body.data.rows.find((b: { id: string }) => b.id === bookingId);
    expect(row).toBeTruthy();
    expect(row.bookingReference).toMatch(/^BK-/);
    expect(row.ownerName).toBe('Owner A');
    expect(row.courtName).toBe('Court 1');
  });
});
