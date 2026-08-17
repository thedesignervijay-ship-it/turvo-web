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

describe('settings and audit logs', () => {
  let tdb: TestDatabase;
  let ctx: TestContext;
  let ownerAuth: { Authorization: string };
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
    adminAuth = await authHeader(UUID.adminUser);

    const seeded = await seedApprovedTurf(tdb.db, { turfId: UUID.turfA, ownerId: UUID.ownerA });
    turfId = seeded.turfId;
    courtId = seeded.courtId;
    bookingDate = nextDateWithDow(1);
  });

  afterAll(async () => {
    await tdb.pg.close();
  });

  it('lets an admin list, create and update settings', async () => {
    const created = await request(ctx.app)
      .patch('/api/v1/settings')
      .set(adminAuth)
      .send({
        settings: [
          { key: 'booking.cancel.hours', value: 12, description: 'Hours before booking to cancel' },
          { key: 'support.email', value: 'support@turvo.example' },
        ],
      });
    expect(created.status).toBe(200);
    expect(created.body.data.length).toBe(2);

    const list = await request(ctx.app).get('/api/v1/settings').set(adminAuth);
    expect(list.status).toBe(200);
    const cancelHours = list.body.data.find((s: { key: string }) => s.key === 'booking.cancel.hours');
    expect(cancelHours.value).toBe(12);
  });

  it('updates a single setting by key', async () => {
    const res = await request(ctx.app)
      .patch('/api/v1/settings/support.email')
      .set(adminAuth)
      .send({ value: 'new@turvo.example' });
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe('new@turvo.example');
  });

  it('forbids owners from managing settings', async () => {
    const res = await request(ctx.app).get('/api/v1/settings').set(ownerAuth);
    expect(res.status).toBe(403);
  });

  it('records audit entries for settings changes', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/audit-logs?action=SETTING_UPDATE')
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.rows.length).toBeGreaterThanOrEqual(3);
    expect(res.body.data.rows[0].userName).toBe('Admin');
  });

  it('lists audit logs and filters by entity type', async () => {
    await request(ctx.app)
      .post('/api/v1/bookings')
      .set(ownerAuth)
      .send({
        courtId,
        bookingDate,
        startTime: '07:00',
        endTime: '08:00',
        customerName: 'Audit Check',
        customerPhone: '9876543210',
        bookingSource: 'PHONE',
      });
    const res = await request(ctx.app)
      .get('/api/v1/audit-logs?entityType=bookings&action=BOOKING_CREATE')
      .set(adminAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.rows.length).toBe(1);
    expect(res.body.data.rows[0].action).toBe('BOOKING_CREATE');
    expect(res.body.data.rows[0].newValue.customerName).toBe('Audit Check');
  });

  it('forbids owners from reading audit logs', async () => {
    const res = await request(ctx.app).get('/api/v1/audit-logs').set(ownerAuth);
    expect(res.status).toBe(403);
  });
});
