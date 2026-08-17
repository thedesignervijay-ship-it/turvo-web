import { apiClient } from '../lib/apiClient.js';

/** PATCH /profile — updates the admin's own user profile. */
export async function updateProfile(input: {
  name?: string;
  phone?: string;
}): Promise<{ user: import('../types/domain.js').UserDto; owner: null }> {
  return apiClient.patch<{ user: import('../types/domain.js').UserDto; owner: null }>('/profile', input);
}
