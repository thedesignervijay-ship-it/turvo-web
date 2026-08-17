import type { Request, Response } from 'express';
import { sendSuccess } from '../lib/http.js';
import type { SettingsService, SettingInput, AuditListQuery } from '../services/settings.service.js';
import type { AuditLogRow } from '../repositories/auditLog.repo.js';

function actorOf(req: Request): { id: string; ip?: string | null; userAgent?: string | null } {
  return { id: req.auth!.user.id, ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null };
}

function serializeSetting(s: { id: string; key: string; value: unknown; description: string | null; updated_by: string | null; created_at: Date; updated_at: Date }) {
  return {
    id: s.id,
    key: s.key,
    value: s.value,
    description: s.description,
    updatedBy: s.updated_by,
    createdAt: s.created_at.toISOString(),
    updatedAt: s.updated_at.toISOString(),
  };
}

function serializeAuditRow(row: AuditLogRow & { user_name?: string | null; user_email?: string | null }) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name ?? null,
    userEmail: row.user_email ?? null,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    oldValue: row.old_value,
    newValue: row.new_value,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at.toISOString(),
  };
}

export function createSettingsController(settingsService: SettingsService) {
  return {
    list: async (_req: Request, res: Response): Promise<void> => {
      const settings = await settingsService.list();
      sendSuccess(res, settings.map(serializeSetting));
    },

    upsertAll: async (req: Request, res: Response): Promise<void> => {
      const body = req.validated!.body as { settings: SettingInput[] };
      const saved = await settingsService.upsertAll(body.settings, actorOf(req));
      sendSuccess(res, saved.map(serializeSetting), 'Settings updated.');
    },

    upsertOne: async (req: Request, res: Response): Promise<void> => {
      const body = req.validated!.body as { value: unknown; description?: string | null };
      const saved = await settingsService.upsertOne(String(req.params.key), body, actorOf(req));
      sendSuccess(res, serializeSetting(saved), 'Setting updated.');
    },

    auditList: async (req: Request, res: Response): Promise<void> => {
      const query = req.validated!.query as unknown as AuditListQuery;
      const result = await settingsService.auditList(query);
      sendSuccess(res, { ...result, rows: result.rows.map(serializeAuditRow) });
    },
  };
}
