import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '../env.js';

/**
 * Supabase Auth client (spec section 5). The access token minted here is sent
 * as the Bearer token for /api/v1 requests; the backend verifies it with the
 * project JWT secret and resolves the application user from the users table.
 */
export const supabase: SupabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
