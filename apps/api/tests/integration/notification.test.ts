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

describe('notifications', () => {
  let tdb: TestDatabase;
  let ctx: TestContext;
  let ownerAuth: { Authorization: string };
  let otherOwnerAuth: { Authorization: string };
  let adminAuth: { Authorization: string };
  let turfId: string;
  let courtId: string;
  let bookingDate: string;

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
    bookingDate = nextDateWithDow(1);

    const res = await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({
        courtId,
        bookingDate,
        startTime: '07:00',
        endTime: '08:00',
        customerName: 'Ravi Kumar',
        customerPhone: '9876543210',
        bookingSource: 'PHONE',
      });
    expect(res.status).toBe(201);
  });

  afterAll(async () => {
    await tdb.pg.close();
  });

  it('lists the owners notifications', async () => {
    const res = await request(ctx.app).get('/api/v1/notifications').set(ownerAuth);
    expect(res.status).toBe(200);
    const types = res.body.data.rows.map((n: { type: string }) => n.type);
    expect(types).toContain('NEW_BOOKING');
  });

  it('filters unread notifications', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/notifications?unreadOnly=true')
      .set(ownerAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.rows.every((n: { isRead: boolean }) => n.isRead === false)).toBe(true);
  });

  it('reports the unread count', async () => {
    const res = await request(ctx.app).get('/api/v1/notifications/unread-count').set(ownerAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBeGreaterThan(0);
  });

  it('marks a single notification as read', async () => {
    const list = await request(ctx.app).get('/api/v1/notifications?unreadOnly=true').set(ownerAuth);
    const id = list.body.data.rows[0].id;
    const res = await request(ctx.app).patch(`/api/v1/notifications/${id}/read`).set(ownerAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.isRead).toBe(true);
    expect(res.body.data.readAt).toBeTruthy();
  });

  it('marks all notifications as read', async () => {
    const res = await request(ctx.app).patch('/api/v1/notifications/read-all').set(ownerAuth);
    expect(res.status).toBe(200);
    const count = await request(ctx.app).get('/api/v1/notifications/unread-count').set(ownerAuth);
    expect(count.body.data.count).toBe(0);
  });

  it('hides another users notification', async () => {
    const list = await request(ctx.app).get('/api/v1/notifications').set(ownerAuth);
    const id = list.body.data.rows[0].id;
    const res = await request(ctx.app).patch(`/api/v1/notifications/${id}/read`).set(otherOwnerAuth);
    expect(res.status).toBe(404);
  });

  it('lets admins list their own notifications', async () => {
    const res = await request(ctx.app).get('/api/v1/notifications').set(adminAuth);
    expect(res.status).toBe(200);
  });
});
