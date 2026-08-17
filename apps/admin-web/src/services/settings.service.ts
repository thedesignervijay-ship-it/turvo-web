import { apiClient } from '../lib/apiClient.js';
import type { PlatformSettingDto } from '../types/domain.js';

export interface SettingInput {
  key: string;
  value: unknown;
  description?: string | null;
}

/** GET /settings — all platform settings (admin). */
export async function listSettings(): Promise<PlatformSettingDto[]> {
  return apiClient.get<PlatformSettingDto[]>('/settings');
}

/** PATCH /settings — upsert multiple settings at once (admin). */
export async function updateSettings(settings: SettingInput[]): Promise<PlatformSettingDto[]> {
  return apiClient.patch<PlatformSettingDto[]>('/settings', { settings });
}
