import { apiClient } from '../lib/apiClient.js';
import type { MeResponse, RegisterResponse } from '../types/domain.js';

/** GET /auth/me — current user, owner profile and permissions. */
export async function getMe(): Promise<MeResponse> {
  return apiClient.get<MeResponse>('/auth/me');
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  phone: string;
  businessName: string;
  businessPhone: string;
  businessEmail?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  pincode: string;
}

/** POST /auth/register — creates the owner account (public). */
export async function registerOwner(input: RegisterInput): Promise<RegisterResponse> {
  return apiClient.post<RegisterResponse>('/auth/register', input);
}

/** POST /auth/logout — server-side logout contract. */
export async function logout(): Promise<void> {
  await apiClient.post<void>('/auth/logout');
}
