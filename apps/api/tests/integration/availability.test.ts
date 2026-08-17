import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestDatabase, type TestDatabase } from '../helpers/testDb.js';
import { createTestContext, authHeader, type TestContext } from '../helpers/testClient.js';
import { seedUsers, seedMasterItems, seedApprovedTurf, UUID, futureDate } from '../helpers/fixtures.js';

const fullWeek = (opening = '06:00', closing = '23:00') =>
  [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({ dayOfWeek, openingTime: opening, closingTime: closing }));

describe('operating hours', () => {
  let tdb: TestDatabase;
  let ctx: TestContext;
  let turfId: string;

  beforeAll(async () => {
    tdb = await createTestDatabase();
    ctx = createTestContext(tdb.db);
    await seedUsers(tdb.db);
    await seedMasterItems(tdb.db);
    turfId = (await seedApprovedTurf(tdb.db, { turfId: UUID.turfA, ownerId: UUID.ownerA })).turfId;
  });

  afterAll(async () => {
    await tdb.pg.close();
  });

  it('replaces the weekly operating hours', async () => {
    const res = await request(ctx.app)
      .put(`/api/v1/turfs/${turfId}/operating-hours`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ days: fullWeek('07:00', '22:00') });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(7);
    expect(res.body.data[0].openingTime).toBe('07:00:00');
  });

  it('rejects a partial week (422)', async () => {
    const res = await request(ctx.app)
      .put(`/api/v1/turfs/${turfId}/operating-hours`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ days: fullWeek().slice(0, 5) });
    expect(res.status).toBe(422);
  });

  it('rejects duplicate days (422)', async () => {
    const res = await request(ctx.app)
      .put(`/api/v1/turfs/${turfId}/operating-hours`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ days: [...fullWeek().slice(0, 6), { ...fullWeek()[0] }] });
    expect(res.status).toBe(422);
  });

  it('rejects opening after closing (422)', async () => {
    const res = await request(ctx.app)
      .put(`/api/v1/turfs/${turfId}/operating-hours`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ days: fullWeek('23:00', '06:00') });
    expect(res.status).toBe(422);
  });

  it('rejects another owner changing hours (404)', async () => {
    const res = await request(ctx.app)
      .put(`/api/v1/turfs/${turfId}/operating-hours`)
      .set(await authHeader(UUID.ownerBUser))
      .send({ days: fullWeek() });
    expect(res.status).toBe(404);
  });
});

describe('availability blocks and slots', () => {
  let tdb: TestDatabase;
  let ctx: TestContext;
  let turfId: string;
  let courtId: string;
  let weekday: string;

  beforeAll(async () => {
    tdb = await createTestDatabase();
    ctx = createTestContext(tdb.db);
    await seedUsers(tdb.db);
    await seedMasterItems(tdb.db);
    const seeded = await seedApprovedTurf(tdb.db, { turfId: UUID.turfA, ownerId: UUID.ownerA });
    turfId = seeded.turfId;
    courtId = seeded.courtId;
    weekday = futureDate(2);
  });

  afterAll(async () => {
    await tdb.pg.close();
  });

  it('lists available slots for the day', async () => {
    const res = await request(ctx.app)
      .get(`/api/v1/turfs/${turfId}/availability?date=${weekday}`)
      .set(await authHeader(UUID.ownerAUser));
    expect(res.status).toBe(200);
    expect(res.body.data.courts).toHaveLength(1);
    const court = res.body.data.courts[0];
    expect(court.courtId).toBe(courtId);
    expect(court.slots.length).toBeGreaterThan(0);
    expect(court.slots.every((s: { available: boolean }) => s.available)).toBe(true);
  });

  it('creates a maintenance block and hides the slot', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/availability-blocks`)
      .set(await authHeader(UUID.ownerAUser))
      .send({
        courtId,
        startDateTime: `${weekday}T06:00:00+05:30`,
        endDateTime: `${weekday}T10:00:00+05:30`,
        blockType: 'MAINTENANCE',
        reason: 'Turf repair',
      });
    expect(res.status).toBe(201);
    expect(res.body.data.blockType).toBe('MAINTENANCE');

    const avail = await request(ctx.app)
      .get(`/api/v1/turfs/${turfId}/availability?date=${weekday}`)
      .set(await authHeader(UUID.ownerAUser));
    const slots = avail.body.data.courts[0].slots;
    expect(slots.filter((s: { available: boolean }) => !s.available).length).toBeGreaterThan(0);
  });

  it('rejects a block whose court belongs elsewhere (404)', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/availability-blocks`)
      .set(await authHeader(UUID.ownerAUser))
      .send({
        courtId: UUID.turfB,
        startDateTime: `${weekday}T06:00:00+05:30`,
        endDateTime: `${weekday}T07:00:00+05:30`,
        blockType: 'EMERGENCY',
      });
    expect(res.status).toBe(404);
  });

  it('includes the days blocks in the availability response', async () => {
    const created = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/availability-blocks`)
      .set(await authHeader(UUID.ownerAUser))
      .send({
        courtId,
        startDateTime: `${weekday}T14:00:00+05:30`,
        endDateTime: `${weekday}T15:00:00+05:30`,
        blockType: 'OWNER_BLOCK',
        reason: 'Private event',
      });
    expect(created.status).toBe(201);

    const avail = await request(ctx.app)
      .get(`/api/v1/turfs/${turfId}/availability?date=${weekday}`)
      .set(await authHeader(UUID.ownerAUser));
    expect(avail.status).toBe(200);
    const block = avail.body.data.blocks.find((b: { id: string }) => b.id === created.body.data.id);
    expect(block).toBeDefined();
    expect(block.blockType).toBe('OWNER_BLOCK');
    expect(block.reason).toBe('Private event');
    expect(block.courtId).toBe(courtId);
  });

  it('rejects start after end (422)', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/availability-blocks`)
      .set(await authHeader(UUID.ownerAUser))
      .send({
        startDateTime: `${weekday}T08:00:00+05:30`,
        endDateTime: `${weekday}T07:00:00+05:30`,
        blockType: 'OWNER_BLOCK',
      });
    expect(res.status).toBe(422);
  });

  it('deletes a block and restores the slot', async () => {
    const list = await request(ctx.app)
      .get(`/api/v1/turfs/${turfId}/availability?date=${weekday}`)
      .set(await authHeader(UUID.ownerAUser));
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/availability-blocks`)
      .set(await authHeader(UUID.ownerAUser))
      .send({
        courtId,
        startDateTime: `${weekday}T12:00:00+05:30`,
        endDateTime: `${weekday}T13:00:00+05:30`,
        blockType: 'OWNER_BLOCK',
      });
    expect(res.status).toBe(201);
    const blockId = res.body.data.id;

    const after = await request(ctx.app)
      .get(`/api/v1/turfs/${turfId}/availability?date=${weekday}`)
      .set(await authHeader(UUID.ownerAUser));
    expect(after.body.data.courts[0].slots.find((s: { startTime: string }) => s.startTime === '12:00:00').available).toBe(false);

    const del = await request(ctx.app)
      .delete(`/api/v1/availability-blocks/${blockId}`)
      .set(await authHeader(UUID.ownerAUser));
    expect(del.status).toBe(200);

    const restored = await request(ctx.app)
      .get(`/api/v1/turfs/${turfId}/availability?date=${weekday}`)
      .set(await authHeader(UUID.ownerAUser));
    expect(restored.body.data.courts[0].slots.find((s: { startTime: string }) => s.startTime === '12:00:00').available).toBe(true);
    expect(list.status).toBe(200);
  });

  it('rejects deleting another owners block (404)', async () => {
    const res = await request(ctx.app)
      .delete(`/api/v1/availability-blocks/${UUID.turfB}`)
      .set(await authHeader(UUID.ownerBUser));
    expect(res.status).toBe(404);
  });
});
