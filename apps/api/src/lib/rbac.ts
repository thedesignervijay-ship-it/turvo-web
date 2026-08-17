import { ROLES, type Role } from '@turvo/shared';

/**
 * RBAC permission sets (spec section 6).
 *
 * Additions beyond the spec's literal lists (documented):
 *  - ADMIN gains `profile.read`/`profile.update` so the Admin profile page
 *    (spec section 33, page 21) can use the shared /profile endpoints.
 *  - OWNER gains `dashboard.view` because the Owner dashboard (spec section 21)
 *    is a required owner page backed by /dashboard.
 */

export const ADMIN_PERMISSIONS = {
  'dashboard.view': true,
  'owners.read': true,
  'owners.update': true,
  'owners.activate': true,
  'owners.deactivate': true,
  'turfs.read': true,
  'turfs.update': true,
  'turfs.approve': true,
  'turfs.reject': true,
  'turfs.activate': true,
  'turfs.deactivate': true,
  'courts.read': true,
  'courts.update': true,
  'master-data.create': true,
  'master-data.read': true,
  'master-data.update': true,
  'master-data.activate': true,
  'master-data.deactivate': true,
  'bookings.read': true,
  'notifications.read': true,
  'notifications.update': true,
  'reports.read': true,
  'settings.manage': true,
  'audit-logs.read': true,
  'profile.read': true,
  'profile.update': true,
} as const;

export const OWNER_PERMISSIONS = {
  'profile.read': true,
  'profile.update': true,
  'dashboard.view': true,
  'turfs.create': true,
  'turfs.read': true,
  'turfs.update': true,
  'turfs.submit': true,
  'master-data.read': true,
  'courts.manage': true,
  'availability.manage': true,
  'pricing.manage': true,
  'bookings.read': true,
  'bookings.manage': true,
  'notifications.read': true,
  'notifications.update': true,
  'earnings.read': true,
  'reports.read': true,
} as const;

export type AdminPermission = keyof typeof ADMIN_PERMISSIONS;
export type OwnerPermission = keyof typeof OWNER_PERMISSIONS;
export type Permission = AdminPermission | OwnerPermission;

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  [ROLES.ADMIN]: new Set(
    Object.keys(ADMIN_PERMISSIONS) as AdminPermission[],
  ),
  [ROLES.OWNER]: new Set(
    Object.keys(OWNER_PERMISSIONS) as OwnerPermission[],
  ),
};

/**
 * An authorized role passes if it holds ANY of the required permissions.
 */
export function hasPermission(
  role: Role,
  required: readonly Permission[],
): boolean {
  const owned = ROLE_PERMISSIONS[role];
  return required.some((p) => owned.has(p));
}

export function permissionsFor(role: Role): Permission[] {
  return [...ROLE_PERMISSIONS[role]];
}
