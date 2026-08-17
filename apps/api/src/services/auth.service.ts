import { ROLES } from '@turvo/shared';
import type { DbClient } from '../db/client.js';
import type { UserRepo } from '../repositories/user.repo.js';
import type { OwnerRepo } from '../repositories/owner.repo.js';
import type { NotificationRepo } from '../repositories/notification.repo.js';
import { createUserRepo } from '../repositories/user.repo.js';
import { createOwnerRepo } from '../repositories/owner.repo.js';
import { createNotificationRepo } from '../repositories/notification.repo.js';
import {
  alreadyExists,
  forbidden,
  serviceUnavailable,
  unauthorized,
} from '../lib/errors.js';
import { permissionsFor } from '../lib/rbac.js';
import {
  isAuthProviderError,
  type AuthAdminGateway,
} from '../supabase/authAdmin.js';

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

export interface AuthServiceDeps {
  db: DbClient;
  userRepo: UserRepo;
  ownerRepo: OwnerRepo;
  notificationRepo: NotificationRepo;
  authAdmin: AuthAdminGateway;
}

export function createAuthService(deps: AuthServiceDeps) {
  return {
    async register(input: RegisterInput) {
      const existing = await deps.userRepo.findByEmail(input.email);
      if (existing) {
        throw alreadyExists('An account with this email already exists.');
      }

      let authUser: { id: string; email: string };
      try {
        authUser = await deps.authAdmin.createUser({
          email: input.email,
          password: input.password,
        });
      } catch (err) {
        if (isAuthProviderError(err) && err.code === 'user_already_exists') {
          throw alreadyExists('An account with this email already exists.');
        }
        if (isAuthProviderError(err) && err.status >= 500) {
          throw serviceUnavailable('Authentication service is temporarily unavailable.');
        }
        throw err;
      }

      try {
        return await deps.db.transaction(async (tx) => {
          const users = createUserRepo(tx);
          const owners = createOwnerRepo(tx);
          const notifications = createNotificationRepo(tx);

          const user = await users.create({
            authUserId: authUser.id,
            role: ROLES.OWNER,
            name: input.name,
            email: input.email,
            phone: input.phone,
          });

          const owner = await owners.create({
            userId: user.id,
            businessName: input.businessName,
            businessPhone: input.businessPhone,
            businessEmail: input.businessEmail,
            addressLine1: input.addressLine1,
            addressLine2: input.addressLine2,
            city: input.city,
            state: input.state,
            pincode: input.pincode,
          });

          await notifications.createForActiveAdmins({
            type: 'OWNER_REGISTERED',
            title: 'New owner registered',
            message: `${input.name} (${input.email}) registered as a turf owner.`,
            entityType: 'users',
            entityId: user.id,
          });

          return { user, owner };
        });
      } catch (err) {
        throw err;
      }
    },

    async me(authUserId: string) {
      const user = await deps.userRepo.findByAuthUserId(authUserId);
      if (!user) {
        throw unauthorized('Account not found.');
      }
      if (user.status === 'INACTIVE') {
        throw forbidden('Your account has been deactivated.');
      }
      const owner = user.role === ROLES.OWNER ? await deps.ownerRepo.findByUserId(user.id) : null;
      return { user, owner, permissions: permissionsFor(user.role) };
    },

    async logout(): Promise<void> {
      // Supabase sessions are stateless JWTs; the client signs out of Supabase
      // Auth. The backend endpoint exists for the API contract (spec section 5).
      return;
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
