import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestDatabase, type TestDatabase } from '../helpers/testDb.js';
import { createTestContext, authHeader, type TestContext } from '../helpers/testClient.js';
import { seedUsers, seedMasterItems, seedApprovedTurf, sportId, UUID } from '../helpers/fixtures.js';

describe('courts', () => {
  let tdb: TestDatabase;
  let ctx: TestContext;
  let turfId: string;
  let footballId: string;

  beforeAll(async () => {
    tdb = await createTestDatabase();
    ctx = createTestContext(tdb.db);
    await seedUsers(tdb.db);
    await seedMasterItems(tdb.db);
    footballId = await sportId(tdb.db);
    turfId = (await seedApprovedTurf(tdb.db, { turfId: UUID.turfA, ownerId: UUID.ownerA })).turfId;
  });

  afterAll(async () => {
    await tdb.pg.close();
  });

  const courtBody = () => ({ sportId: footballId, name: 'Court 2', capacity: 12 });

  it('creates a court on an owned turf', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/courts`)
      .set(await authHeader(UUID.ownerAUser))
      .send(courtBody());
    expect(res.status).toBe(201);
    expect(res.body.data.turfId).toBe(turfId);
    expect(res.body.data.sportId).toBe(footballId);
    expect(res.body.data.capacity).toBe(12);
    expect(res.body.data.status).toBe('ACTIVE');
  });

  it('rejects a sport the turf does not support (400)', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/courts`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ ...courtBody(), sportId: UUID.turfB });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejects creating a court on another owners turf (404)', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/courts`)
      .set(await authHeader(UUID.ownerBUser))
      .send(courtBody());
    expect(res.status).toBe(404);
  });

  it('lists courts of a turf', async () => {
    const res = await request(ctx.app)
      .get(`/api/v1/turfs/${turfId}/courts`)
      .set(await authHeader(UUID.ownerAUser));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.every((c: { turfId: string }) => c.turfId === turfId)).toBe(true);
  });

  it('rejects empty court updates (422)', async () => {
    const list = await request(ctx.app).get(`/api/v1/turfs/${turfId}/courts`).set(await authHeader(UUID.ownerAUser));
    const courtId = list.body.data[0].id;
    const res = await request(ctx.app)
      .patch(`/api/v1/courts/${courtId}`)
      .set(await authHeader(UUID.ownerAUser))
      .send({});
    expect(res.status).toBe(422);
  });

  it('updates a court', async () => {
    const list = await request(ctx.app).get(`/api/v1/turfs/${turfId}/courts`).set(await authHeader(UUID.ownerAUser));
    const courtId = list.body.data[0].id;
    const res = await request(ctx.app)
      .patch(`/api/v1/courts/${courtId}`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ capacity: 20, description: 'Renovated' });
    expect(res.status).toBe(200);
    expect(res.body.data.capacity).toBe(20);
    expect(res.body.data.description).toBe('Renovated');
  });

  it('blocks updating another owners court (404)', async () => {
    const list = await request(ctx.app).get(`/api/v1/turfs/${turfId}/courts`).set(await authHeader(UUID.ownerAUser));
    const courtId = list.body.data[0].id;
    const res = await request(ctx.app)
      .patch(`/api/v1/courts/${courtId}`)
      .set(await authHeader(UUID.ownerBUser))
      .send({ capacity: 1 });
    expect(res.status).toBe(404);
  });

  it('deactivates then activates a court', async () => {
    const list = await request(ctx.app).get(`/api/v1/turfs/${turfId}/courts`).set(await authHeader(UUID.ownerAUser));
    const courtId = list.body.data[0].id;

    const off = await request(ctx.app)
      .patch(`/api/v1/courts/${courtId}/status`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ status: 'INACTIVE' });
    expect(off.status).toBe(200);
    expect(off.body.data.status).toBe('INACTIVE');

    const again = await request(ctx.app)
      .patch(`/api/v1/courts/${courtId}/status`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ status: 'INACTIVE' });
    expect(again.status).toBe(409);

    const on = await request(ctx.app)
      .patch(`/api/v1/courts/${courtId}/status`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ status: 'ACTIVE' });
    expect(on.status).toBe(200);
    expect(on.body.data.status).toBe('ACTIVE');
  });
});
