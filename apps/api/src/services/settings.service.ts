import type { SettingsRepo, PlatformSettingRow } from '../repositories/settings.repo.js';
import type { AuditLogRepo, AuditLogRow } from '../repositories/auditLog.repo.js';
import type { AuditService } from './audit.service.js';

export interface Actor {
  id: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface AuditListQuery {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
  sortOrder: 'asc' | 'desc';
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
}

export interface SettingInput {
  key: string;
  value: unknown;
  description?: string | null;
}

export function createSettingsService(deps: {
  settingsRepo: SettingsRepo;
  auditLogRepo: AuditLogRepo;
  audit: AuditService;
}) {
  return {
    async list(): Promise<PlatformSettingRow[]> {
      return deps.settingsRepo.list();
    },

    async upsertAll(input: SettingInput[], actor: Actor): Promise<PlatformSettingRow[]> {
      const result: PlatformSettingRow[] = [];
      for (const setting of input) {
        const saved = await deps.settingsRepo.upsert({
          key: setting.key,
          value: setting.value,
          description: setting.description,
          updatedBy: actor.id,
        });
        result.push(saved);
        await deps.audit.log({
          actor,
          action: 'SETTING_UPDATE',
          entityType: 'platform_settings',
          entityId: saved.id,
          oldValue: null,
          newValue: { key: setting.key, value: setting.value },
        });
      }
      return result;
    },

    async upsertOne(key: string, input: { value: unknown; description?: string | null }, actor: Actor): Promise<PlatformSettingRow> {
      const saved = await deps.settingsRepo.upsert({
        key,
        value: input.value,
        description: input.description,
        updatedBy: actor.id,
      });
      await deps.audit.log({
        actor,
        action: 'SETTING_UPDATE',
        entityType: 'platform_settings',
        entityId: saved.id,
        oldValue: null,
        newValue: { key, value: input.value },
      });
      return saved;
    },

    async auditList(query: AuditListQuery) {
      const { rows, total } = await deps.auditLogRepo.list({
        search: query.search,
        action: query.action,
        entityType: query.entityType,
        entityId: query.entityId,
        from: query.from,
        to: query.to,
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        orderBy: { column: query.sort ?? 'created_at', order: query.sortOrder },
      });
      return { rows: rows as (AuditLogRow & { user_name?: string | null; user_email?: string | null })[], total, page: query.page, limit: query.limit };
    },
  };
}

export type SettingsService = ReturnType<typeof createSettingsService>;
