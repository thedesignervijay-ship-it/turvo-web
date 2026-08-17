import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    pool: 'forks',
    env: {
      NODE_ENV: 'test',
      PORT: '4000',
      SUPABASE_URL: 'https://test-project.supabase.co',
      SUPABASE_ANON_KEY: 'anon-test-key',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
      SUPABASE_JWT_SECRET: 'test-jwt-secret-0123456789abcdef',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/turvo',
      CORS_ORIGIN: 'http://localhost:5173',
    },
  },
});
