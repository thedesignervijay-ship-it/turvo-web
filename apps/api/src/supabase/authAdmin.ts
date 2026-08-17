import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { alreadyExists, internalError } from '../lib/errors.js';

export interface CreatedAuthUser {
  id: string;
  email: string;
}

export class AuthProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'AuthProviderError';
  }
}

/**
 * Backend-only gateway to Supabase Auth admin operations (spec section 5:
 * "Service-role credentials are backend-only"). Used solely where the
 * specification requires a server-side action that a client JWT cannot
 * perform (creating the Supabase Auth user during owner registration).
 * Never used for user-owned data operations.
 */
export interface AuthAdminGateway {
  createUser(input: { email: string; password: string }): Promise<CreatedAuthUser>;
}

export function createSupabaseAuthAdmin(): AuthAdminGateway {
  const client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  return {
    async createUser({ email, password }) {
      const { data, error } = await client.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) {
        if (error.status === 422 || error.status === 400 || error.code === 'user_already_exists') {
          throw new AuthProviderError(
            'An account with this email already exists.',
            'user_already_exists',
            409,
          );
        }
        throw new AuthProviderError(
          `Supabase Auth error: ${error.message}`,
          'auth_provider_error',
          error.status ?? 502,
        );
      }
      if (!data.user?.id) {
        throw internalError('Supabase Auth returned no user.');
      }
      return { id: data.user.id, email: data.user.email ?? email };
    },
  };
}

export function isAuthProviderError(err: unknown): err is AuthProviderError {
  return err instanceof AuthProviderError;
}

export function authProviderConflict(err: AuthProviderError): ReturnType<typeof alreadyExists> {
  return alreadyExists(err.message);
}
