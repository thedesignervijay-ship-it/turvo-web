import type { DbClient } from '../db/client.js';
import type { UserRepo } from '../repositories/user.repo.js';
import type { OwnerRepo, UpdateOwnerInput } from '../repositories/owner.repo.js';
import { createOwnerRepo } from '../repositories/owner.repo.js';
import { createUserRepo } from '../repositories/user.repo.js';
import { buildOrderBy, buildPaginationMeta } from '../lib/pagination.js';
import { badRequest, notFound } from '../lib/errors.js';
import type { AuditService } from './audit.service.js';
import type { OwnerStatus, UserStatus } from '@turvo/shared';
import type { profileUpdateSchema } from '../validations/owner.schema.js';
import type { z } from 'zod';

export type ProfileUpdateInput = z.input<typeof profileUpdateSchema>;

export interface Actor {
  id: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface OwnerListResult {
  items: unknown[];
  pagination: ReturnType<typeof buildPaginationMeta>;
}

const OWNER_SORT_COLUMNS = ['business_name', 'city', 'status', 'created_at', 'user_name'] as const;

export function createOwnerService(deps: {
  db: DbClient;
  userRepo: UserRepo;
  ownerRepo: OwnerRepo;
  audit: AuditService;
}) {
  return {
    /** Current user's profile (personal user + owner business profile if any). */
    async getProfile(userId: string) {
      const user = await deps.userRepo.findById(userId);
      if (!user) throw notFound('User not found.');
      const owner = await deps.ownerRepo.findByUserId(userId);
      return { user, owner };
    },

    /** User updates personal and/or business profile fields. */
    async updateProfile(userId: string, input: ProfileUpdateInput) {
      const { name, phone, ...business } = input;
      const owner = await deps.ownerRepo.findByUserId(userId);
      if (Object.keys(business).length > 0 && !owner) {
        throw badRequest('This account has no owner profile.');
      }

      return deps.db.transaction(async (tx) => {
        const users = createUserRepo(tx);
        const owners = createOwnerRepo(tx);
        if (name !== undefined || phone !== undefined) {
          await users.updateProfile(userId, { name, phone });
        }
        const updatedOwner =
          owner && Object.keys(business).length > 0 ? await owners.update(owner.id, business) : null;
        const updatedUser = await users.findById(userId);
        return { user: updatedUser!, owner: updatedOwner ?? owner };
      });
    },

    /** Admin: list/search/filter owners. */
    async listOwners(query: {
      page: number;
      limit: number;
      search?: string;
      sort?: string;
      sortOrder: 'asc' | 'desc';
      status?: OwnerStatus;
      city?: string;
    }) {
      const { rows, total } = await deps.ownerRepo.list({
        search: query.search,
        status: query.status,
        city: query.city,
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        orderBy: buildOrderBy(query.sort, query.sortOrder, OWNER_SORT_COLUMNS),
      });
      return {
        items: rows,
        pagination: buildPaginationMeta(query.page, query.limit, total),
      };
    },

    /** Admin: full owner details. */
    async getOwner(id: string) {
      const owner = await deps.ownerRepo.findById(id);
      if (!owner) throw notFound('Owner not found.');
      return owner;
    },

    /** Admin: update an owner's business profile. */
    async updateOwner(id: string, input: UpdateOwnerInput, actor: Actor) {
      const owner = await deps.ownerRepo.findById(id);
      if (!owner) throw notFound('Owner not found.');
      const updated = await deps.ownerRepo.update(id, input);
      await deps.audit.log({
        actor,
        action: 'OWNER_UPDATE',
        entityType: 'turf_owners',
        entityId: id,
        oldValue: { businessName: owner.business_name },
        newValue: { ...input },
      });
      return updated!;
    },

    /**
     * Admin: activate/deactivate an owner. Deactivation also disables the
     * application user so the owner can no longer sign in (spec section 5:
     * "Deactivated users cannot access protected operations").
     */
    async setOwnerStatus(id: string, status: OwnerStatus, actor: Actor) {
      const owner = await deps.ownerRepo.findById(id);
      if (!owner) throw notFound('Owner not found.');
      if (owner.status === status) {
        throw badRequest(`Owner is already ${status.toLowerCase()}.`);
      }

      const result = await deps.db.transaction(async (tx) => {
        const users = createUserRepo(tx);
        const owners = createOwnerRepo(tx);
        const updatedOwner = await owners.setStatus(id, status);
        const updatedUser = await users.setStatus(owner.user_id, status as UserStatus);
        return { owner: updatedOwner!, user: updatedUser! };
      });

      await deps.audit.log({
        actor,
        action: status === 'ACTIVE' ? 'OWNER_ACTIVATE' : 'OWNER_DEACTIVATE',
        entityType: 'turf_owners',
        entityId: id,
        oldValue: { status: owner.status },
        newValue: { status },
      });
      return result;
    },
  };
}

export type OwnerService = ReturnType<typeof createOwnerService>;
