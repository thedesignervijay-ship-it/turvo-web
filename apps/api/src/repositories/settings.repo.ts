import type { DbClient, QueryableRow } from '../db/client.js';

export interface PlatformSettingRow {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  updated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

function toSetting(row: QueryableRow): PlatformSettingRow {
  return {
    id: String(row.id),
    key: String(row.key),
    value: row.value,
    description: row.description == null ? null : String(row.description),
    updated_by: row.updated_by == null ? null : String(row.updated_by),
    created_at: new Date(String(row.created_at)),
    updated_at: new Date(String(row.updated_at)),
  };
}

export function createSettingsRepo(db: DbClient) {
  return {
    async list(): Promise<PlatformSettingRow[]> {
      const { rows } = await db.query<QueryableRow>(
        `select id, key, value, description, updated_by, created_at, updated_at
         from public.platform_settings order by key asc`,
      );
      return rows.map(toSetting);
    },

    async find(key: string): Promise<PlatformSettingRow | null> {
      const { rows } = await db.query<QueryableRow>(
        `select id, key, value, description, updated_by, created_at, updated_at
         from public.platform_settings where key = $1`,
        [key],
      );
      return rows.length ? toSetting(rows[0]!) : null;
    },

    async upsert(input: { key: string; value: unknown; description?: string | null; updatedBy: string }): Promise<PlatformSettingRow> {
      const { rows } = await db.query<QueryableRow>(
        `insert into public.platform_settings (key, value, description, updated_by)
         values ($1, $2::jsonb, $3, $4)
         on conflict (key) do update
           set value = excluded.value,
               description = coalesce(excluded.description, platform_settings.description),
               updated_by = excluded.updated_by
         returning id, key, value, description, updated_by, created_at, updated_at`,
        [input.key, JSON.stringify(input.value), input.description ?? null, input.updatedBy],
      );
      return toSetting(rows[0]!);
    },
  };
}

export type SettingsRepo = ReturnType<typeof createSettingsRepo>;
