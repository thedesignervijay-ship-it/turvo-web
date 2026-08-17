import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestDatabase, type TestDatabase } from '../helpers/testDb.js';
import { createTestContext, authHeader, type TestContext } from '../helpers/testClient.js';
import { seedUsers, UUID } from '../helpers/fixtures.js';

const validBody = {
  name: 'Ravi Kumar',
  email: 'ravi@example.com',
  password: 'strongpass123',
  phone: '9876543210',
  businessName: 'Ravi Turfs',
  businessPhone: '9876543211',
  addressLine1: '12 MG Road',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001',
};

describe('auth', () => {
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

  describe('POST /api/v1/auth/register', () => {
    it('registers an owner and notifies active admins', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/auth/register')
        .send(validBody);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('OWNER');
      expect(res.body.data.user.email).toBe(validBody.email);
      expect(res.body.data.owner.businessName).toBe('Ravi Turfs');

      const { rows } = await tdb.db.query<{ n: number }>(
        `select count(*)::int as n from notifications where type = 'OWNER_REGISTERED' and user_id = $1::uuid`,
        [UUID.adminUser],
      );
      expect(rows[0]!.n).toBe(1);

      const stored = await tdb.db.query<{ role: string; auth_user_id: string | null }>(
        `select role, auth_user_id from users where email = $1`,
        [validBody.email],
      );
      expect(stored.rows[0]!.role).toBe('OWNER');
      expect(stored.rows[0]!.auth_user_id).toBe(ctx.authAdmin.created[0]!.id);
    });

    it('rejects a duplicate email with 409 ALREADY_EXISTS', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/auth/register')
        .send(validBody);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_EXISTS');
    });

    it('rejects invalid payloads with 422 VALIDATION_ERROR', async () => {
      const res = await request(ctx.app).post('/api/v1/auth/register').send({
        name: '',
        email: 'not-an-email',
        password: 'short',
        phone: 'abc',
        pincode: '123',
      });
      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('returns the owner user with owner profile and owner permissions', async () => {
      const res = await request(ctx.app)
        .get('/api/v1/auth/me')
        .set(await authHeader(UUID.ownerAUser));
      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('owner.a@example.com');
      expect(res.body.data.owner.businessName).toBe('Owner A Turfs');
      expect(res.body.data.permissions).toContain('bookings.manage');
      expect(res.body.data.permissions).toContain('turfs.submit');
      expect(res.body.data.permissions).not.toContain('owners.read');
    });

    it('returns the admin user with admin permissions and no owner profile', async () => {
      const res = await request(ctx.app)
        .get('/api/v1/auth/me')
        .set(await authHeader(UUID.adminUser));
      expect(res.status).toBe(200);
      expect(res.body.data.user.role).toBe('ADMIN');
      expect(res.body.data.owner).toBeNull();
      expect(res.body.data.permissions).toContain('owners.read');
      expect(res.body.data.permissions).toContain('settings.manage');
    });

    it('rejects a deactivated account with 403 ACCOUNT_INACTIVE', async () => {
      await tdb.db.query(`update users set status = 'INACTIVE' where id = $1::uuid`, [UUID.ownerBUser]);
      const res = await request(ctx.app)
        .get('/api/v1/auth/me')
        .set(await authHeader(UUID.ownerBUser));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
      await tdb.db.query(`update users set status = 'ACTIVE' where id = $1::uuid`, [UUID.ownerBUser]);
    });

    it('rejects a token for an unknown user with 401', async () => {
      const res = await request(ctx.app)
        .get('/api/v1/auth/me')
        .set(await authHeader('99999999-9999-9999-9999-999999999999'));
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('returns success for an authenticated user', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/auth/logout')
        .set(await authHeader(UUID.ownerAUser));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
