import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestContext,
  authHeader,
  type TestContext,
} from '../helpers/testClient.js';
import type { TestDatabase } from '../helpers/testDb.js';
import { createTestDatabase } from '../helpers/testDb.js';
import { seedUsers, seedMasterItems, seedApprovedTurf, UUID } from '../helpers/fixtures.js';

describe('master data', () => {
  let tdb: TestDatabase;
  let ctx: TestContext;
  let adminAuth: { Authorization: string };
  let ownerAuth: { Authorization: string };
  let turfId: string;
  let footballId: string;
  let parkingId: string;
  let restroomId: string;

  const createItem = (body: Record<string, unknown>, auth: { Authorization: string }) =>
    request(ctx.app).post('/api/v1/master-data/items').set(auth).send(body);

  beforeAll(async () => {
    tdb = await createTestDatabase();
    ctx = createTestContext(tdb.db);
    await seedUsers(tdb.db);
    await seedMasterItems(tdb.db);
    adminAuth = await authHeader(UUID.adminUser);
    ownerAuth = await authHeader(UUID.ownerAUser);

    const seeded = await seedApprovedTurf(tdb.db, { turfId: UUID.turfA, ownerId: UUID.ownerA });
    turfId = seeded.turfId;
    footballId = seeded.sportId;

    const parking = await createItem({ category: 'FACILITIES', name: 'Test Facility One', sortOrder: 1 }, adminAuth);
    parkingId = parking.body.data.id;
    const restroom = await createItem({ category: 'FACILITIES', name: 'Test Facility Two', sortOrder: 2 }, adminAuth);
    restroomId = restroom.body.data.id;
  });

  afterAll(async () => {
    await tdb.pg.close();
  });

  it('lists categories', async () => {
    const res = await request(ctx.app).get('/api/v1/master-data/categories').set(adminAuth);
    expect(res.status).toBe(200);
    const codes = res.body.data.map((c: { code: string }) => c.code);
    expect(codes).toContain('SPORTS');
    expect(codes).toContain('FACILITIES');
    expect(codes).toContain('RULES');
    expect(codes).toContain('EQUIPMENT');
  });

  it('lists items with category and status filters', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/master-data/items?category=SPORTS&status=ACTIVE&page=1&limit=10')
      .set(adminAuth);
    expect(res.status).toBe(200);
    const names = res.body.data.rows.map((i: { name: string }) => i.name);
    expect(names).toContain('Football');
    expect(res.body.data.rows.every((i: { categoryCode: string }) => i.categoryCode === 'SPORTS')).toBe(true);
  });

  it('creates a master item as admin', async () => {
    const res = await createItem({ category: 'RULES', name: 'New Rule' }, adminAuth);
    expect(res.status).toBe(201);
    expect(res.body.data.categoryCode).toBe('RULES');
    expect(res.body.data.status).toBe('ACTIVE');
    expect(res.body.data.name).toBe('New Rule');
  });

  it('forbids owners from creating master items', async () => {
    const res = await createItem({ category: 'EQUIPMENT', name: 'Football' }, ownerAuth);
    expect(res.status).toBe(403);
  });

  it('lets owners read master items for turf setup', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/master-data/items?limit=100')
      .set(ownerAuth);
    expect(res.status).toBe(200);
    expect(res.body.data.rows.length).toBeGreaterThan(0);
    const codes = new Set(res.body.data.rows.map((i: { categoryCode: string }) => i.categoryCode));
    expect(codes.has('SPORTS')).toBe(true);
    expect(codes.has('FACILITIES')).toBe(true);
  });

  it('rejects invalid category codes', async () => {
    const res = await createItem({ category: 'UNKNOWN', name: 'X' }, adminAuth);
    expect(res.status).toBe(422);
  });

  it('rejects duplicate names within a category', async () => {
    const res = await createItem({ category: 'FACILITIES', name: 'Parking' }, adminAuth);
    expect(res.status).toBe(409);
  });

  it('allows the same name in different categories', async () => {
    const res = await createItem({ category: 'EQUIPMENT', name: 'Parking' }, adminAuth);
    expect(res.status).toBe(201);
  });

  it('updates a master item', async () => {
    const res = await request(ctx.app)
      .patch(`/api/v1/master-data/items/${parkingId}`)
      .set(adminAuth)
      .send({ name: 'Car Parking' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Car Parking');
  });

  it('rejects an empty update', async () => {
    const res = await request(ctx.app).patch(`/api/v1/master-data/items/${parkingId}`).set(adminAuth).send({});
    expect(res.status).toBe(422);
  });

  it('deactivates a master item and lists it', async () => {
    const res = await request(ctx.app)
      .patch(`/api/v1/master-data/items/${parkingId}/status`)
      .set(adminAuth)
      .send({ status: 'INACTIVE' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('INACTIVE');

    const list = await request(ctx.app)
      .get('/api/v1/master-data/items?status=INACTIVE&category=FACILITIES')
      .set(adminAuth);
    const names = list.body.data.rows.map((i: { name: string }) => i.name);
    expect(names).toContain('Car Parking');
  });

  it('rejects deactivating an already inactive item', async () => {
    const res = await request(ctx.app)
      .patch(`/api/v1/master-data/items/${parkingId}/status`)
      .set(adminAuth)
      .send({ status: 'INACTIVE' });
    expect(res.status).toBe(409);
  });

  it('returns 404 for a missing master item', async () => {
    const missing = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const res = await request(ctx.app).patch(`/api/v1/master-data/items/${missing}/status`).set(adminAuth).send({ status: 'ACTIVE' });
    expect(res.status).toBe(404);
  });

  it('rejects assigning a sport as a selectable facility', async () => {
    const res = await request(ctx.app)
      .put(`/api/v1/turfs/${turfId}/master-items`)
      .set(ownerAuth)
      .send({ itemIds: [footballId] });
    expect(res.status).toBe(400);
  });

  it('rejects assigning an inactive item', async () => {
    const res = await request(ctx.app)
      .put(`/api/v1/turfs/${turfId}/master-items`)
      .set(ownerAuth)
      .send({ itemIds: [parkingId] });
    expect(res.status).toBe(400);
  });

  it('assigns facilities/rules/equipment and reads them back', async () => {
    const res = await request(ctx.app)
      .put(`/api/v1/turfs/${turfId}/master-items`)
      .set(ownerAuth)
      .send({ itemIds: [restroomId] });
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].categoryCode).toBe('FACILITIES');

    const get = await request(ctx.app).get(`/api/v1/turfs/${turfId}/master-items`).set(ownerAuth);
    expect(get.status).toBe(200);
    expect(get.body.data.map((i: { id: string }) => i.id)).toEqual([restroomId]);
  });

  it('forbids a non-owner from editing a turf selection', async () => {
    const otherAuth = await authHeader(UUID.ownerBUser);
    const res = await request(ctx.app)
      .put(`/api/v1/turfs/${turfId}/master-items`)
      .set(otherAuth)
      .send({ itemIds: [] });
    expect(res.status).toBe(404);
  });
});
