import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestDatabase, type TestDatabase } from '../helpers/testDb.js';
import { createTestContext, authHeader, type TestContext } from '../helpers/testClient.js';
import { seedUsers, UUID } from '../helpers/fixtures.js';

describe('owners & profile', () => {
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

  describe('GET /api/v1/profile', () => {
    it('returns the owner user and business profile', async () => {
      const res = await request(ctx.app)
        .get('/api/v1/profile')
        .set(await authHeader(UUID.ownerAUser));
      expect(res.status).toBe(200);
      expect(res.body.data.user).toEqual(
        expect.objectContaining({ id: UUID.ownerAUser, role: 'OWNER', name: 'Owner A', email: 'owner.a@example.com' }),
      );
      
      expect(res.body.data.owner).toEqual(
        expect.objectContaining({ id: UUID.ownerA, userId: UUID.ownerAUser, businessName: 'Owner A Turfs', status: 'ACTIVE' }),
      );
    });

    it('returns the admin user with a null owner profile', async () => {
      const res = await request(ctx.app)
        .get('/api/v1/profile')
        .set(await authHeader(UUID.adminUser));
      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.owner).toBeNull();
    });

    it('rejects unauthenticated requests', async () => {
      const res = await request(ctx.app).get('/api/v1/profile');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PATCH /api/v1/profile', () => {
    it('updates personal fields', async () => {
      const res = await request(ctx.app)
        .patch('/api/v1/profile')
        .set(await authHeader(UUID.ownerBUser))
        .send({ name: 'Owner Bee', phone: '9000000999' });
      expect(res.status).toBe(200);
      expect(res.body.data.user.name).toBe('Owner Bee');
      expect(res.body.data.user.phone).toBe('9000000999');
      expect(res.body.data.owner.businessName).toBe('Owner B Turfs');
    });

    it('updates business fields', async () => {
      const res = await request(ctx.app)
        .patch('/api/v1/profile')
        .set(await authHeader(UUID.ownerBUser))
        .send({ businessName: 'Bee Turfs Ltd', city: 'Bengaluru', pincode: '560001' });
      expect(res.status).toBe(200);
      expect(res.body.data.owner.businessName).toBe('Bee Turfs Ltd');
      expect(res.body.data.owner.city).toBe('Bengaluru');
      expect(res.body.data.owner.pincode).toBe('560001');
    });

    it('rejects an empty update (422)', async () => {
      const res = await request(ctx.app)
        .patch('/api/v1/profile')
        .set(await authHeader(UUID.ownerAUser))
        .send({});
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid fields (422)', async () => {
      const res = await request(ctx.app)
        .patch('/api/v1/profile')
        .set(await authHeader(UUID.ownerAUser))
        .send({ email: 'not-an-email', pincode: '12' });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('admin /api/v1/owners', () => {
    it('lists owners with pagination and turf count', async () => {
      const res = await request(ctx.app)
        .get('/api/v1/owners')
        .set(await authHeader(UUID.adminUser));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
      expect(res.body.data[0]).toHaveProperty('turfCount');
    });

    it('filters and searches owners', async () => {
      const res = await request(ctx.app)
        .get('/api/v1/owners?status=INACTIVE&search=b')
        .set(await authHeader(UUID.adminUser));
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);

      const res2 = await request(ctx.app)
        .get('/api/v1/owners?search=Owner')
        .set(await authHeader(UUID.adminUser));
      expect(res2.status).toBe(200);
      expect(res2.body.pagination.total).toBe(2);
    });

    it('denies owners (403)', async () => {
      const res = await request(ctx.app)
        .get('/api/v1/owners')
        .set(await authHeader(UUID.ownerAUser));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns a single owner', async () => {
      const res = await request(ctx.app)
        .get(`/api/v1/owners/${UUID.ownerA}`)
        .set(await authHeader(UUID.adminUser));
      expect(res.status).toBe(200);
      expect(res.body.data.businessName).toBe('Owner A Turfs');
      expect(res.body.data.user.email).toBe('owner.a@example.com');
    });

    it('returns 404 for an unknown owner', async () => {
      const res = await request(ctx.app)
        .get('/api/v1/owners/99999999-9999-4999-8999-999999999999')
        .set(await authHeader(UUID.adminUser));
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('updates an owner and records an audit log', async () => {
      const res = await request(ctx.app)
        .patch(`/api/v1/owners/${UUID.ownerA}`)
        .set(await authHeader(UUID.adminUser))
        .send({ businessName: 'Alpha Turfs', state: 'Tamil Nadu' });
      expect(res.status).toBe(200);
      expect(res.body.data.businessName).toBe('Alpha Turfs');

      const { rows } = await tdb.db.query<{ action: string }>(
        `select action from audit_logs where entity_type = 'turf_owners' and entity_id = $1 order by created_at desc limit 1`,
        [UUID.ownerA],
      );
      expect(rows[0]?.action).toBe('OWNER_UPDATE');
    });
  });

  describe('PATCH /api/v1/owners/:id/status', () => {
    it('deactivates an owner and blocks login', async () => {
      const res = await request(ctx.app)
        .patch(`/api/v1/owners/${UUID.ownerB}/status`)
        .set(await authHeader(UUID.adminUser))
        .send({ status: 'INACTIVE' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('INACTIVE');

      const blocked = await request(ctx.app).get('/api/v1/profile').set(await authHeader(UUID.ownerBUser));
      expect(blocked.status).toBe(403);
      expect(blocked.body.error.code).toBe('ACCOUNT_INACTIVE');

      const { rows } = await tdb.db.query<{ action: string }>(
        `select action from audit_logs where entity_type = 'turf_owners' and entity_id = $1 order by created_at desc limit 1`,
        [UUID.ownerB],
      );
      expect(rows[0]?.action).toBe('OWNER_DEACTIVATE');
    });

    it('reactivates an owner', async () => {
      const res = await request(ctx.app)
        .patch(`/api/v1/owners/${UUID.ownerB}/status`)
        .set(await authHeader(UUID.adminUser))
        .send({ status: 'ACTIVE' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ACTIVE');

      const ok = await request(ctx.app).get('/api/v1/profile').set(await authHeader(UUID.ownerBUser));
      expect(ok.status).toBe(200);
    });

    it('rejects re-applying the same status (400)', async () => {
      const res = await request(ctx.app)
        .patch(`/api/v1/owners/${UUID.ownerA}/status`)
        .set(await authHeader(UUID.adminUser))
        .send({ status: 'ACTIVE' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects an invalid status (422)', async () => {
      const res = await request(ctx.app)
        .patch(`/api/v1/owners/${UUID.ownerA}/status`)
        .set(await authHeader(UUID.adminUser))
        .send({ status: 'SUSPENDED' });
      expect(res.status).toBe(422);
    });
  });
});
