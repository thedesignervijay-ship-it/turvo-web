import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestDatabase, type TestDatabase } from '../helpers/testDb.js';
import { createTestContext, authHeader, type TestContext } from '../helpers/testClient.js';
import { seedUsers, seedMasterItems, seedApprovedTurf, UUID, futureDate, nextDateWithDow } from '../helpers/fixtures.js';

describe('pricing rules', () => {
  let tdb: TestDatabase;
  let ctx: TestContext;
  let turfId: string;
  let courtId: string;
  let secondCourtId: string;
  let weekday: string;

  beforeAll(async () => {
    tdb = await createTestDatabase();
    ctx = createTestContext(tdb.db);
    await seedUsers(tdb.db);
    await seedMasterItems(tdb.db);
    const seeded = await seedApprovedTurf(tdb.db, { turfId: UUID.turfA, ownerId: UUID.ownerA });
    turfId = seeded.turfId;
    courtId = seeded.courtId;
    const courtRes = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/courts`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ sportId: seeded.sportId, name: 'Court 2', capacity: 10 });
    secondCourtId = courtRes.body.data.id;
    weekday = nextDateWithDow(1);
  });

  afterAll(async () => {
    await tdb.pg.close();
  });

  const ruleBody = () => ({
    courtId: secondCourtId,
    startTime: '06:00',
    endTime: '23:00',
    dayType: 'WEEKDAY',
    price: 700,
    effectiveFrom: futureDate(-1),
  });

  it('lists seeded pricing rules', async () => {
    const res = await request(ctx.app)
      .get(`/api/v1/turfs/${turfId}/pricing`)
      .set(await authHeader(UUID.ownerAUser));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  it('creates a pricing rule', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/pricing`)
      .set(await authHeader(UUID.ownerAUser))
      .send(ruleBody());
    expect(res.status).toBe(201);
    expect(res.body.data.price).toBe(700);
    expect(res.body.data.courtId).toBe(secondCourtId);
  });

  it('rejects overlapping active rules (409)', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/pricing`)
      .set(await authHeader(UUID.ownerAUser))
      .send(ruleBody());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('allows a non-overlapping day type', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/pricing`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ ...ruleBody(), dayType: 'WEEKEND' });
    expect(res.status).toBe(201);
  });

  it('rejects a court from another turf (404)', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/pricing`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ ...ruleBody(), courtId: UUID.turfB });
    expect(res.status).toBe(404);
  });

  it('rejects non-positive price (422)', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/pricing`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ ...ruleBody(), price: 0 });
    expect(res.status).toBe(422);
  });

  it('rejects another owner (404)', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/pricing`)
      .set(await authHeader(UUID.ownerBUser))
      .send(ruleBody());
    expect(res.status).toBe(404);
  });

  it('updates a rule price', async () => {
    const list = await request(ctx.app)
      .get(`/api/v1/turfs/${turfId}/pricing`)
      .set(await authHeader(UUID.ownerAUser));
    const ruleId = list.body.data.find((r: { dayType: string }) => r.dayType === 'WEEKEND').id;
    const res = await request(ctx.app)
      .patch(`/api/v1/pricing/${ruleId}`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ price: 850 });
    expect(res.status).toBe(200);
    expect(res.body.data.price).toBe(850);
  });

  it('deactivates and reactivates a rule', async () => {
    const list = await request(ctx.app)
      .get(`/api/v1/turfs/${turfId}/pricing`)
      .set(await authHeader(UUID.ownerAUser));
    const ruleId = list.body.data.find((r: { dayType: string }) => r.dayType === 'WEEKEND').id;

    const off = await request(ctx.app)
      .patch(`/api/v1/pricing/${ruleId}/status`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ status: 'INACTIVE' });
    expect(off.status).toBe(200);
    expect(off.body.data.status).toBe('INACTIVE');

    const again = await request(ctx.app)
      .patch(`/api/v1/pricing/${ruleId}/status`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ status: 'INACTIVE' });
    expect(again.status).toBe(409);

    const on = await request(ctx.app)
      .patch(`/api/v1/pricing/${ruleId}/status`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ status: 'ACTIVE' });
    expect(on.status).toBe(200);
  });

  it('reflects pricing in availability slots', async () => {
    const res = await request(ctx.app)
      .get(`/api/v1/turfs/${turfId}/availability?date=${weekday}`)
      .set(await authHeader(UUID.ownerAUser));
    expect(res.status).toBe(200);
    const secondCourt = res.body.data.courts.find((c: { courtId: string }) => c.courtId === secondCourtId);
    const slot = secondCourt.slots.find((s: { startTime: string }) => s.startTime === '06:00:00');
    expect(slot.price).toBe(700);
    expect(slot.currency).toBe('INR');
  });
});
