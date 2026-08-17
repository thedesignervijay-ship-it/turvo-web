import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DbClient } from '../../src/db/client.js';

const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  'supabase',
  'migrations',
);

/** Mirrors Supabase: auth schema, auth.uid() GUC stub, anon/authenticated roles. */
const SUPABASE_PARITY_SQL = `
  create schema if not exists auth;
  create or replace function auth.uid()
  returns uuid
  language sql
  stable
  as $$
    select nullif(current_setting('app.uid', true), '')::uuid;
  $$;
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then
      create role authenticated nologin;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'anon') then
      create role anon nologin;
    end if;
  end $$;
  grant usage on schema public to anon, authenticated;
  grant usage on schema auth to anon, authenticated;
`;

const POST_MIGRATION_GRANTS_SQL = `
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant execute on function public.current_user_role() to anon, authenticated;
  grant execute on function public.is_admin() to anon, authenticated;
  grant execute on function public.is_owner() to anon, authenticated;
`;

export function pgliteDbClient(db: PGlite): DbClient {
  return {
    async query<Row extends Record<string, unknown> = Record<string, unknown>>(
      text: string,
      params?: unknown[],
    ) {
      const result = await db.query<Row>(text, params);
      return { rows: result.rows, rowCount: result.affectedRows ?? null };
    },
    async transaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
      await db.exec('BEGIN');
      try {
        const value = await fn(pgliteDbClient(db));
        await db.exec('COMMIT');
        return value;
      } catch (err) {
        await db.exec('ROLLBACK');
        throw err;
      }
    },
  };
}

export interface TestDatabase {
  pg: PGlite;
  db: DbClient;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const pg = new PGlite({ extensions: { btree_gist } });
  await pg.exec(SUPABASE_PARITY_SQL);

  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) {
    throw new Error('No migration files found');
  }
  for (const file of files) {
    await pg.exec(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
  }
  await pg.exec(POST_MIGRATION_GRANTS_SQL);

  return { pg, db: pgliteDbClient(pg) };
}
