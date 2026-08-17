import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestDatabase, type TestDatabase } from '../helpers/testDb.js';
import { createTestContext, authHeader, type TestContext } from '../helpers/testClient.js';
import { seedUsers, seedMasterItems, seedApprovedTurf, UUID } from '../helpers/fixtures.js';

const PNG_1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('turf images', () => {
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

  it('rejects an admin uploading an image (403)', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/images`)
      .set(await authHeader(UUID.adminUser))
      .attach('image', PNG_1x1, { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(403);
  });

  it('rejects an upload from another owner (404)', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/images`)
      .set(await authHeader(UUID.ownerBUser))
      .attach('image', PNG_1x1, { filename: 'x.png', contentType: 'image/png' });
    expect(res.status).toBe(404);
  });

  it('uploads an image and makes it primary', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/images`)
      .set(await authHeader(UUID.ownerAUser))
      .attach('image', PNG_1x1, { filename: 'field.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.message).toContain('uploaded');
    expect(res.body.data.isPrimary).toBe(true);
    expect(res.body.data.storagePath).toMatch(/^turfs\/.+\/[A-Za-z0-9-]+\.png$/);
    expect(ctx.storage.objects.size).toBe(1);
  });

  it('rejects a non-image file (400)', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/images`)
      .set(await authHeader(UUID.ownerAUser))
      .attach('image', Buffer.from('not an image'), { filename: 'x.txt', contentType: 'text/plain' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('rejects an image larger than 5 MB (400)', async () => {
    const big = Buffer.alloc(6 * 1024 * 1024, 1);
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/images`)
      .set(await authHeader(UUID.ownerAUser))
      .attach('image', big, { filename: 'big.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('lists images with signed URLs', async () => {
    const res = await request(ctx.app)
      .get(`/api/v1/turfs/${turfId}/images`)
      .set(await authHeader(UUID.ownerAUser));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].url).toContain('storage.test');
  });

  it('uploads a second image and reorders with a new primary', async () => {
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/images`)
      .set(await authHeader(UUID.ownerAUser))
      .attach('image', PNG_1x1, { filename: 'aerial.png', contentType: 'image/png' });
    expect(res.status).toBe(201);
    expect(res.body.data.isPrimary).toBe(false);

    const list = await request(ctx.app).get(`/api/v1/turfs/${turfId}/images`).set(await authHeader(UUID.ownerAUser));
    const ids = list.body.data.map((img: { id: string }) => img.id);
    const newPrimary = ids[1];

    const reorder = await request(ctx.app)
      .put(`/api/v1/turfs/${turfId}/images/order`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ imageIds: [newPrimary, ids[0]], primaryImageId: newPrimary });
    expect(reorder.status).toBe(200);
    expect(reorder.body.data.find((img: { id: string }) => img.id === newPrimary).isPrimary).toBe(true);
    expect(reorder.body.data[0].id).toBe(newPrimary);
  });

  it('rejects reorder with a partial image list (400)', async () => {
    const list = await request(ctx.app).get(`/api/v1/turfs/${turfId}/images`).set(await authHeader(UUID.ownerAUser));
    const ids = list.body.data.map((img: { id: string }) => img.id);
    const res = await request(ctx.app)
      .put(`/api/v1/turfs/${turfId}/images/order`)
      .set(await authHeader(UUID.ownerAUser))
      .send({ imageIds: [ids[0]] });
    expect(res.status).toBe(400);
  });

  it('deletes an image and promotes the next primary', async () => {
    const list = await request(ctx.app).get(`/api/v1/turfs/${turfId}/images`).set(await authHeader(UUID.ownerAUser));
    const images = list.body.data;
    const primaryId = images.find((img: { isPrimary: boolean }) => img.isPrimary).id;
    const otherId = images.find((img: { id: string }) => img.id !== primaryId).id;
    const storageCount = ctx.storage.objects.size;

    const del = await request(ctx.app)
      .delete(`/api/v1/turfs/${turfId}/images/${primaryId}`)
      .set(await authHeader(UUID.ownerAUser));
    expect(del.status).toBe(200);

    expect(ctx.storage.objects.size).toBe(storageCount - 1);
    const after = await request(ctx.app).get(`/api/v1/turfs/${turfId}/images`).set(await authHeader(UUID.ownerAUser));
    expect(after.body.data).toHaveLength(1);
    expect(after.body.data[0].id).toBe(otherId);
    expect(after.body.data[0].isPrimary).toBe(true);
  });

  it('rejects deleting an unknown image (404)', async () => {
    const res = await request(ctx.app)
      .delete(`/api/v1/turfs/${turfId}/images/00000000-0000-4000-8000-000000000000`)
      .set(await authHeader(UUID.ownerAUser));
    expect(res.status).toBe(404);
  });

  it('enforces the 10 image limit (409)', async () => {
    for (let i = 0; i < 9; i++) {
      const res = await request(ctx.app)
        .post(`/api/v1/turfs/${turfId}/images`)
        .set(await authHeader(UUID.ownerAUser))
        .attach('image', PNG_1x1, { filename: `f${i}.png`, contentType: 'image/png' });
      expect(res.status).toBe(201);
    }
    const res = await request(ctx.app)
      .post(`/api/v1/turfs/${turfId}/images`)
      .set(await authHeader(UUID.ownerAUser))
      .attach('image', PNG_1x1, { filename: 'one-too-many.png', contentType: 'image/png' });
    expect(res.status).toBe(409);
  });
});
