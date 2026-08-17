import request from 'supertest';
import { createApp, API_BASE_PATH } from '../../src/app.js';
import type { Container } from '../../src/container.js';
import { createContainer } from '../../src/container.js';
import type { DbClient } from '../../src/db/client.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { createFakeAuthAdmin, type FakeAuthAdmin } from './fakeAuthAdmin.js';
import { createFakeStorage, type FakeStorageGateway } from './fakeStorage.js';

export interface TestContext {
  app: ReturnType<typeof createApp>;
  container: Container;
  authAdmin: FakeAuthAdmin;
  storage: FakeStorageGateway;
  api: string;
}

export function createTestContext(db: DbClient): TestContext {
  const authAdmin = createFakeAuthAdmin();
  const storage = createFakeStorage();
  const container = createContainer(db, { authAdmin, storage });
  const app = createApp(container);
  return { app, container, authAdmin, storage, api: API_BASE_PATH };
}

export async function authHeader(sub: string): Promise<{ Authorization: string }> {
  return { Authorization: `Bearer ${await signAccessToken(sub)}` };
}

export const agent = request;
