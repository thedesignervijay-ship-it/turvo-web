import type { DbClient } from '../db/client.js';
import type { TurfRepo } from '../repositories/turf.repo.js';
import { createTurfRepo } from '../repositories/turf.repo.js';
import type { MasterRepo } from '../repositories/master.repo.js';
import type { NotificationRepo } from '../repositories/notification.repo.js';
import { buildOrderBy, buildPaginationMeta } from '../lib/pagination.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors.js';
import type { AuditService } from './audit.service.js';
import type { Role, TurfApprovalStatus, TurfStatus } from '@turvo/shared';
import type { CreateTurfInput, UpdateTurfInput } from '../repositories/turf.repo.js';

export interface Actor {
  id: string;
  ip?: string | null;
  userAgent?: string | null;
}

const TURF_SORT_COLUMNS = ['name', 'city', 'status', 'approval_status', 'created_at'] as const;

interface TurfContext {
  user: { id: string; role: Role };
  ownerId?: string;
}

function editableApprovalStates(): TurfApprovalStatus[] {
  return ['DRAFT', 'REJECTED'];
}

export function createTurfService(deps: {
  db: DbClient;
  turfRepo: TurfRepo;
  masterRepo: MasterRepo;
  notificationRepo: NotificationRepo;
  audit: AuditService;
}) {
  return {
    /** Owner creates a turf draft. */
    async create(ownerId: string, input: CreateTurfInput, actor: Actor) {
      if (!ownerId) throw forbidden('Owner profile required.');

      const sports = await deps.masterRepo.findActiveSportsByIds(input.sportIds);
      if (sports.length !== input.sportIds.length) {
        throw badRequest('One or more selected sports are invalid or inactive.');
      }

      const result = await deps.db.transaction(async (tx) => {
        const turfs = createTurfRepo(tx);
        const turf = await turfs.create({ ...input, ownerId });
        await turfs.replaceSports(turf.id, input.sportIds);
        return { turf };
      });

      await deps.audit.log({
        actor,
        action: 'TURF_CREATE',
        entityType: 'turfs',
        entityId: result.turf.id,
        oldValue: null,
        newValue: { name: input.name, sportIds: input.sportIds },
      });

      return deps.turfRepo.findById(result.turf.id);
    },

    /** Owner lists own turfs; admin lists all with filters. */
    async list(ctx: TurfContext, query: {
      page: number;
      limit: number;
      search?: string;
      sort?: string;
      sortOrder: 'asc' | 'desc';
      status?: TurfStatus;
      approvalStatus?: TurfApprovalStatus;
      city?: string;
      ownerId?: string;
    }) {
      const { rows, total } = await deps.turfRepo.list({
        search: query.search,
        status: query.status,
        approvalStatus: query.approvalStatus,
        city: query.city,
        ownerId: ctx.user.role === 'ADMIN' ? query.ownerId : ctx.ownerId,
        limit: query.limit,
        offset: (query.page - 1) * query.limit,
        orderBy: buildOrderBy(query.sort, query.sortOrder, TURF_SORT_COLUMNS),
      });
      return {
        items: rows,
        pagination: buildPaginationMeta(query.page, query.limit, total),
      };
    },

    /** Reads a turf; owners are restricted to their own turfs. */
    async get(ctx: TurfContext, id: string) {
      const turf =
        ctx.user.role === 'ADMIN'
          ? await deps.turfRepo.findById(id)
          : await deps.turfRepo.findOwnedBy(id, ctx.ownerId!);
      if (!turf) throw notFound('Turf not found.');
      return turf;
    },

    /** Owner edits a DRAFT or REJECTED turf. */
    async update(ctx: TurfContext, id: string, input: UpdateTurfInput & { sportIds?: string[] }, actor: Actor) {
      const turf = await deps.turfRepo.findOwnedBy(id, ctx.ownerId!);
      if (!turf) throw notFound('Turf not found.');
      if (!editableApprovalStates().includes(turf.approval_status)) {
        throw conflict('Turf can only be edited while in DRAFT or REJECTED state.');
      }

      const sportIds = input.sportIds;
      if (sportIds !== undefined) {
        const sports = await deps.masterRepo.findActiveSportsByIds(sportIds);
        if (sports.length !== sportIds.length) {
          throw badRequest('One or more selected sports are invalid or inactive.');
        }
      }

      const result = await deps.db.transaction(async (tx) => {
        const turfs = createTurfRepo(tx);
        const { sportIds: _ignored, ...fields } = input;
        const updated = await turfs.update(id, fields);
        if (sportIds !== undefined) {
          await turfs.replaceSports(id, sportIds);
        }
        return updated!;
      });

      await deps.audit.log({
        actor,
        action: 'TURF_UPDATE',
        entityType: 'turfs',
        entityId: id,
        oldValue: { name: turf.name },
        newValue: { ...input },
      });
      return deps.turfRepo.findById(id);
    },

    /** Owner submits a turf for admin review. */
    async submit(ctx: TurfContext, id: string, actor: Actor) {
      const turf = await deps.turfRepo.findOwnedBy(id, ctx.ownerId!);
      if (!turf) throw notFound('Turf not found.');
      if (!editableApprovalStates().includes(turf.approval_status)) {
        throw conflict('Turf is already submitted or processed.');
      }

      const courts = await deps.turfRepo.courtsCount(id);
      if (courts < 1) throw badRequest('At least one court is required before submission.');

      const hours = await deps.turfRepo.operatingHoursCount(id);
      if (hours < 7) throw badRequest('Operating hours for all seven days are required before submission.');

      await deps.turfRepo.setApprovalStatus(id, 'SUBMITTED', { submittedAt: true });
      await deps.audit.log({
        actor,
        action: 'TURF_SUBMIT',
        entityType: 'turfs',
        entityId: id,
        oldValue: { approval_status: turf.approval_status },
        newValue: { approval_status: 'SUBMITTED' },
      });
      await deps.notificationRepo.createForActiveAdmins({
        type: 'TURF_SUBMITTED',
        title: 'New turf submitted for review',
        message: `${turf.name} (${turf.city}) has been submitted for approval.`,
        entityType: 'turfs',
        entityId: id,
      });
      return deps.turfRepo.findById(id)!;
    },

    /** Admin approves a submitted turf. */
    async approve(id: string, actor: Actor) {
      const turf = await deps.turfRepo.findById(id);
      if (!turf) throw notFound('Turf not found.');
      if (turf.approval_status !== 'SUBMITTED' && turf.approval_status !== 'UNDER_REVIEW') {
        throw conflict('Only submitted turfs can be approved.');
      }
      await deps.turfRepo.setApprovalStatus(id, 'APPROVED', { approvedAt: true });
      await deps.audit.log({
        actor,
        action: 'TURF_APPROVE',
        entityType: 'turfs',
        entityId: id,
        oldValue: { approval_status: turf.approval_status },
        newValue: { approval_status: 'APPROVED' },
      });
      await deps.notificationRepo.create({
        userId: turf.owner_user_id,
        type: 'TURF_APPROVED',
        title: 'Turf approved',
        message: `Your turf "${turf.name}" has been approved.`,
        entityType: 'turfs',
        entityId: id,
      });
      return deps.turfRepo.findById(id)!;
    },

    /** Admin rejects a submitted turf with a reason. */
    async reject(id: string, reason: string, actor: Actor) {
      const turf = await deps.turfRepo.findById(id);
      if (!turf) throw notFound('Turf not found.');
      if (turf.approval_status !== 'SUBMITTED' && turf.approval_status !== 'UNDER_REVIEW') {
        throw conflict('Only submitted turfs can be rejected.');
      }
      await deps.turfRepo.setApprovalStatus(id, 'REJECTED', {
        rejectionReason: reason,
        rejectedAt: true,
      });
      await deps.audit.log({
        actor,
        action: 'TURF_REJECT',
        entityType: 'turfs',
        entityId: id,
        oldValue: { approval_status: turf.approval_status },
        newValue: { approval_status: 'REJECTED', reason },
      });
      await deps.notificationRepo.create({
        userId: turf.owner_user_id,
        type: 'TURF_REJECTED',
        title: 'Turf submission rejected',
        message: `Your turf "${turf.name}" was rejected: ${reason}`,
        entityType: 'turfs',
        entityId: id,
      });
      return deps.turfRepo.findById(id)!;
    },

    /** Admin activates/deactivates an approved turf. */
    async setStatus(id: string, status: TurfStatus, actor: Actor) {
      const turf = await deps.turfRepo.findById(id);
      if (!turf) throw notFound('Turf not found.');
      if (turf.status === status) {
        throw badRequest(`Turf is already ${status.toLowerCase()}.`);
      }
      if (status === 'ACTIVE' && turf.approval_status !== 'APPROVED') {
        throw conflict('Only approved turfs can be activated.');
      }
      if (status === 'ACTIVE' && turf.owner_status !== 'ACTIVE') {
        throw conflict('Turf cannot be activated while the owner is inactive.');
      }
      await deps.turfRepo.setStatus(id, status);
      await deps.audit.log({
        actor,
        action: status === 'ACTIVE' ? 'TURF_ACTIVATE' : 'TURF_DEACTIVATE',
        entityType: 'turfs',
        entityId: id,
        oldValue: { status: turf.status },
        newValue: { status },
      });
      await deps.notificationRepo.create({
        userId: turf.owner_user_id,
        type: status === 'ACTIVE' ? 'TURF_ACTIVATED' : 'TURF_DEACTIVATED',
        title: status === 'ACTIVE' ? 'Turf activated' : 'Turf deactivated',
        message:
          status === 'ACTIVE'
            ? `Your turf "${turf.name}" is now active and receiving bookings.`
            : `Your turf "${turf.name}" has been deactivated. No new bookings will be accepted.`,
        entityType: 'turfs',
        entityId: id,
      });
      return deps.turfRepo.findById(id)!;
    },
  };
}

export type TurfService = ReturnType<typeof createTurfService>;
