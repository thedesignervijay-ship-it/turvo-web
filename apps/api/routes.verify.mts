import request from 'supertest';
import { createTestDatabase } from './tests/helpers/testDb.js';
import { createTestContext } from './tests/helpers/testClient.js';
import { openapiSpec } from './src/openapi/spec.js';

const SAMPLE_UUID = '00000000-0000-4000-8000-000000000000';
const SAMPLE_KEY = 'some.key';

function samplePath(path: string): string {
  return path
    .replace('{turfId}', SAMPLE_UUID)
    .replace('{ownerId}', SAMPLE_UUID)
    .replace('{courtId}', SAMPLE_UUID)
    .replace('{imageId}', SAMPLE_UUID)
    .replace('{itemId}', SAMPLE_UUID)
    .replace('{bookingId}', SAMPLE_UUID)
    .replace('{notificationId}', SAMPLE_UUID)
    .replace('{blockId}', SAMPLE_UUID)
    .replace('{ruleId}', SAMPLE_UUID)
    .replace('{key}', SAMPLE_KEY);
}

const tdb = await createTestDatabase();
const ctx = createTestContext(tdb.db);
const app = ctx.app;

let ok = 0;
let mismatch = 0;
for (const [path, item] of Object.entries((openapiSpec as any).paths)) {
  for (const method of Object.keys(item)) {
    const p = path.startsWith('/api/v1') ? path : `/api/v1${samplePath(path)}`;
    const res = await request(app)[method as 'get'](p);
    const is404 = res.status === 404;
    // Every documented route must exist: without a token it must not 404
    // (protected routes -> 401; public -> 2xx/4xx handled by app).
    if (is404) {
      mismatch++;
      console.log(`  NOT REGISTERED: ${method.toUpperCase()} ${path} -> 404`);
    } else {
      ok++;
    }
  }
}
console.log(`\nProbed ${ok + mismatch} documented endpoints. Registered: ${ok}, 404: ${mismatch}`);
await tdb.pg.close();
if (mismatch > 0) process.exit(1);
