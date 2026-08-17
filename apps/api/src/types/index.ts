import type { OwnerStatus, Role, UserStatus } from '@turvo/shared';

/** The application user, resolved from the verified JWT (users table). */
export interface AuthUser {
  /** users.id */
  id: string;
  /** users.auth_user_id == JWT `sub` */
  authUserId: string;
  role: Role;
  name: string;
  email: string;
  phone: string;
  status: UserStatus;
}

/** The owner business profile attached when the user role is OWNER. */
export interface AuthOwner {
  /** turf_owners.id */
  id: string;
  userId: string;
  businessName: string;
  status: OwnerStatus;
}

export interface AuthContext {
  user: AuthUser;
  owner: AuthOwner | null;
}
