/**
 * Runtime configuration from Vite env vars (apps/admin-web/.env.local).
 * Reference: turvo_phase1_spec.md section 39.
 */

export interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  apiBaseUrl: string;
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. See apps/admin-web/.env.example.`);
  }
  return value;
}

function loadEnv(): EnvConfig {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';
  return {
    supabaseUrl: required('VITE_SUPABASE_URL', supabaseUrl),
    supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY', supabaseAnonKey),
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
  };
}

export const env: EnvConfig = loadEnv();
