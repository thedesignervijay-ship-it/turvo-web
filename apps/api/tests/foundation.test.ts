import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestDatabase, type TestDatabase } from './helpers/testDb.js';
import { createTestContext, authHeader, type TestContext } from './helpers/testClient.js';
import { seedUsers, UUID } from './helpers/fixtures.js';

describe('foundation', () => {
  let tdb: TestDatabase;
  let ctx: TestContext;

  beforeAll(async () => {
    tdb = await createTestDatabase();
    ctx = createTestContext(tdb.db);
    await seedUsers(tdb.db);
  });

  afterAll(async () => {
    await tdb.pg.close();
  });

  it('exposes the health endpoint', async () => {
    const res = await request(ctx.app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('returns the spec success envelope', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/auth/me')
      .set(await authHeader(UUID.ownerAUser));
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        success: true,
        data: expect.any(Object),
        message: expect.any(String),
      }),
    );
  });

  it('rejects requests without a token (401)', async () => {
    const res = await request(ctx.app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an invalid token (401)', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an unknown route with the error envelope (404)', async () => {
    const res = await request(ctx.app)
      .get('/api/v1/nope')
      .set(await authHeader(UUID.adminUser));
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns the OpenAPI spec at /api/v1/docs.json', async () => {
    const res = await request(ctx.app).get('/api/v1/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
  });
});
