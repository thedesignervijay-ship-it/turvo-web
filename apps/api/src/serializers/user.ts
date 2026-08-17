import type { UserRow } from '../repositories/user.repo.js';

export interface UserResponse {
  id: string;
  authUserId: string | null;
  role: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function serializeUser(user: UserRow): UserResponse {
  return {
    id: user.id,
    authUserId: user.auth_user_id,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}
