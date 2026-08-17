import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createTestDatabase, type TestDatabase } from '../helpers/testDb.js';
import { createTestContext, authHeader, type TestContext } from '../helpers/testClient.js';
import { seedUsers, seedMasterItems, sportId, UUID } from '../helpers/fixtures.js';
import { randomUUID } from 'node:crypto';

describe('turfs', () => {
  let tdb: TestDatabase;
  let ctx: TestContext;
  let footballId: string;

  const turfBody = () => ({
    name: 'North Arena',
    description: 'A green turf ground',
    addressLine1: '12 Grounds Road',
    city: 'Chennai',
    state: 'TN',
    pincode: '600001',
    contactPhone: '9000000123',
    slotDurationMinutes: 60,
    sportIds: [footballId],
  });

  beforeAll(async () => {
    tdb = await createTestDatabase();
    ctx = createTestContext(tdb.db);
    await seedUsers(tdb.db);
    await seedMasterItems(tdb.db);
    footballId = await sportId(tdb.db);
  });

  afterAll(async () => {
    await tdb.pg.close();
  });

  describe('owner turf lifecycle', () => {
    it('creates a turf in DRAFT state', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/turfs')
        .set(await authHeader(UUID.ownerAUser))
        .send(turfBody());
      expect(res.status).toBe(201);
      expect(res.body.data.approvalStatus).toBe('DRAFT');
      expect(res.body.data.status).toBe('INACTIVE');
      expect(res.body.data.ownerId).toBe(UUID.ownerA);
      expect(res.body.data.sportIds).toEqual([footballId]);
    });

    it('rejects creation with an invalid sport (400)', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/turfs')
        .set(await authHeader(UUID.ownerAUser))
        .send({ ...turfBody(), sportIds: [randomUUID()] });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects an admin creating a turf (403)', async () => {
      const res = await request(ctx.app)
        .post('/api/v1/turfs')
        .set(await authHeader(UUID.adminUser))
        .send(turfBody());
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('lists only the owner’s turfs', async () => {
      const { rows } = await tdb.db.query<{ id: string }>(
        `insert into turfs (owner_id, name, description, address_line_1, city, state, pincode, contact_phone)
         values ($1::uuid, 'Other Turf', 'd', 'Street', 'Chennai', 'TN', '600001', '9000000001') returning id`,
        [UUID.ownerB],
      );
      const otherId = rows[0].id;

      const mine = await request(ctx.app).get('/api/v1/turfs').set(await authHeader(UUID.ownerAUser));
      expect(mine.status).toBe(200);
      expect(mine.body.data.some((t: { id: string }) => t.id === otherId)).toBe(false);
      expect(mine.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('hides another owner’s turf (404)', async () => {
      const { rows } = await tdb.db.query<{ id: string }>(
        `select id from turfs where owner_id = $1::uuid order by created_at desc limit 1`,
        [UUID.ownerB],
      );
      const res = await request(ctx.app)
        .get(`/api/v1/turfs/${rows[0].id}`)
        .set(await authHeader(UUID.ownerAUser));
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('edits a DRAFT turf', async () => {
      const { rows } = await tdb.db.query<{ id: string }>(
        `select id from turfs where owner_id = $1::uuid order by created_at desc limit 1`,
        [UUID.ownerA],
      );
      const res = await request(ctx.app)
        .patch(`/api/v1/turfs/${rows[0].id}`)
        .set(await authHeader(UUID.ownerAUser))
        .send({ name: 'North Arena Ground' });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe('North Arena Ground');
    });

    it('rejects editing a turf with no changes (422)', async () => {
      const { rows } = await tdb.db.query<{ id: string }>(
        `select id from turfs where owner_id = $1::uuid order by created_at desc limit 1`,
        [UUID.ownerA],
      );
      const res = await request(ctx.app)
        .patch(`/api/v1/turfs/${rows[0].id}`)
        .set(await authHeader(UUID.ownerAUser))
        .send({});
      expect(res.status).toBe(422);
    });

    it('fails submission without a court (400)', async () => {
      const { rows } = await tdb.db.query<{ id: string }>(
        `select id from turfs where owner_id = $1::uuid order by created_at desc limit 1`,
        [UUID.ownerA],
      );
      const res = await request(ctx.app)
        .post(`/api/v1/turfs/${rows[0].id}/submit`)
        .set(await authHeader(UUID.ownerAUser));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('approval workflow', () => {
    let turfId: string;

    beforeAll(async () => {
      const { rows } = await tdb.db.query<{ id: string }>(
        `select id from turfs where owner_id = $1::uuid order by created_at desc limit 1`,
        [UUID.ownerA],
      );
      turfId = rows[0].id;
      await tdb.db.query(
        `insert into courts (turf_id, sport_id, name, capacity) values ($1::uuid, $2::uuid, 'Court 1', 10)`,
        [turfId, footballId],
      );
      await tdb.db.query(
        `insert into turf_operating_hours (turf_id, day_of_week, opening_time, closing_time, is_closed)
         select $1::uuid, g, '06:00', '23:00', false from generate_series(0, 6) as g`,
        [turfId],
      );
    });

    it('submits a complete turf and notifies admins', async () => {
      const res = await request(ctx.app)
        .post(`/api/v1/turfs/${turfId}/submit`)
        .set(await authHeader(UUID.ownerAUser));
      expect(res.status).toBe(200);
      expect(res.body.data.approvalStatus).toBe('SUBMITTED');

      const { rows } = await tdb.db.query<{ count: string }>(
        `select count(*)::text as count from notifications where type = 'TURF_SUBMITTED' and entity_id = $1::uuid and is_read = false`,
        [turfId],
      );
      expect(Number(rows[0].count)).toBeGreaterThanOrEqual(1);
    });

    it('blocks edits after submission (409)', async () => {
      const res = await request(ctx.app)
        .patch(`/api/v1/turfs/${turfId}`)
        .set(await authHeader(UUID.ownerAUser))
        .send({ name: 'Hacked' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('blocks owner from approving (403)', async () => {
      const res = await request(ctx.app)
        .post(`/api/v1/turfs/${turfId}/approve`)
        .set(await authHeader(UUID.ownerAUser));
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects without a reason (422)', async () => {
      const res = await request(ctx.app)
        .post(`/api/v1/turfs/${turfId}/reject`)
        .set(await authHeader(UUID.adminUser))
        .send({});
      expect(res.status).toBe(422);
    });

    it('rejects a submitted turf, notifies the owner, and allows re-edit', async () => {
      const res = await request(ctx.app)
        .post(`/api/v1/turfs/${turfId}/reject`)
        .set(await authHeader(UUID.adminUser))
        .send({ reason: 'Missing floodlights' });
      expect(res.status).toBe(200);
      expect(res.body.data.approvalStatus).toBe('REJECTED');
      expect(res.body.data.rejectionReason).toBe('Missing floodlights');

      const { rows } = await tdb.db.query<{ count: string }>(
        `select count(*)::text as count from notifications where type = 'TURF_REJECTED' and entity_id = $1::uuid and user_id = $2::uuid`,
        [turfId, UUID.ownerAUser],
      );
      expect(Number(rows[0].count)).toBe(1);

      const edit = await request(ctx.app)
        .patch(`/api/v1/turfs/${turfId}`)
        .set(await authHeader(UUID.ownerAUser))
        .send({ description: 'Added floodlights' });
      expect(edit.status).toBe(200);
    });

    it('resubmits, approves and notifies the owner', async () => {
      const resubmit = await request(ctx.app)
        .post(`/api/v1/turfs/${turfId}/submit`)
        .set(await authHeader(UUID.ownerAUser));
      expect(resubmit.status).toBe(200);
      expect(resubmit.body.data.approvalStatus).toBe('SUBMITTED');

      const approve = await request(ctx.app)
        .post(`/api/v1/turfs/${turfId}/approve`)
        .set(await authHeader(UUID.adminUser));
      expect(approve.status).toBe(200);
      expect(approve.body.data.approvalStatus).toBe('APPROVED');

      const { rows } = await tdb.db.query<{ count: string }>(
        `select count(*)::text as count from notifications where type = 'TURF_APPROVED' and entity_id = $1::uuid and user_id = $2::uuid`,
        [turfId, UUID.ownerAUser],
      );
      expect(Number(rows[0].count)).toBe(1);
    });

    it('cannot activate an unapproved turf (409)', async () => {
      const { rows } = await tdb.db.query<{ id: string }>(
        `insert into turfs (owner_id, name, description, address_line_1, city, state, pincode, contact_phone)
         values ($1::uuid, 'Unapproved', 'd', 'Street', 'Chennai', 'TN', '600001', '9000000001') returning id`,
        [UUID.ownerA],
      );
      const res = await request(ctx.app)
        .patch(`/api/v1/turfs/${rows[0].id}/status`)
        .set(await authHeader(UUID.adminUser))
        .send({ status: 'ACTIVE' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('activates an approved turf and notifies the owner', async () => {
      const res = await request(ctx.app)
        .patch(`/api/v1/turfs/${turfId}/status`)
        .set(await authHeader(UUID.adminUser))
        .send({ status: 'ACTIVE' });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ACTIVE');

      const { rows } = await tdb.db.query<{ count: string }>(
        `select count(*)::text as count from notifications where type = 'TURF_ACTIVATED' and entity_id = $1::uuid and user_id = $2::uuid`,
        [turfId, UUID.ownerAUser],
      );
      expect(Number(rows[0].count)).toBe(1);
    });

    it('cannot reactivate once the owner is deactivated (409)', async () => {
      await request(ctx.app)
        .patch(`/api/v1/turfs/${turfId}/status`)
        .set(await authHeader(UUID.adminUser))
        .send({ status: 'INACTIVE' });

      await request(ctx.app)
        .patch(`/api/v1/owners/${UUID.ownerA}/status`)
        .set(await authHeader(UUID.adminUser))
        .send({ status: 'INACTIVE' });

      const res = await request(ctx.app)
        .patch(`/api/v1/turfs/${turfId}/status`)
        .set(await authHeader(UUID.adminUser))
        .send({ status: 'ACTIVE' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });
});
