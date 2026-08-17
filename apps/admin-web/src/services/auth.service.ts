import { apiClient } from '../lib/apiClient.js';
import type { MeResponse } from '../types/domain.js';

/** GET /auth/me — current user, owner profile and permissions. */
export async function getMe(): Promise<MeResponse> {
  return apiClient.get<MeResponse>('/auth/me');
}

/** POST /auth/logout — server-side logout contract. */
export async function logout(): Promise<void> {
  await apiClient.post<void>('/auth/logout');
}
