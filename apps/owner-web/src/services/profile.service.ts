import { apiClient } from '../lib/apiClient.js';
import type { ProfileResponse, UserDto, OwnerDto } from '../types/domain.js';

/** GET /profile — the owner's user and business profile. */
export async function getProfile(): Promise<ProfileResponse> {
  return apiClient.get<ProfileResponse>('/profile');
}

/** PATCH /profile — updates the owner's own user profile (name + phone). */
export async function updateProfile(input: {
  name?: string;
  phone?: string;
}): Promise<{ user: UserDto; owner: OwnerDto | null }> {
  return apiClient.patch<{ user: UserDto; owner: OwnerDto | null }>('/profile', input);
}

/** PATCH /profile — updates the owner's business profile fields. */
export async function updateBusinessProfile(input: {
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string | null;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
}): Promise<{ user: UserDto; owner: OwnerDto | null }> {
  return apiClient.patch<{ user: UserDto; owner: OwnerDto | null }>('/profile', input);
}
