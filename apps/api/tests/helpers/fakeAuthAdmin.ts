import { randomUUID } from 'node:crypto';
import {
  AuthProviderError,
  type AuthAdminGateway,
} from '../../src/supabase/authAdmin.js';

export interface FakeAuthAdmin extends AuthAdminGateway {
  created: Array<{ id: string; email: string }>;
}

/** In-memory Supabase Auth admin used by tests. */
export function createFakeAuthAdmin(opts: { existingEmails?: string[] } = {}): FakeAuthAdmin {
  const created: Array<{ id: string; email: string }> = [];
  return {
    async createUser({ email, password }) {
      if (opts.existingEmails?.includes(email.toLowerCase())) {
        throw new AuthProviderError(
          'An account with this email already exists.',
          'user_already_exists',
          409,
        );
      }
      if (!password || password.length < 8) {
        throw new AuthProviderError('Password too short.', 'invalid_password', 422);
      }
      const id = randomUUID();
      created.push({ id, email });
      return { id, email };
    },
    created,
  };
}
