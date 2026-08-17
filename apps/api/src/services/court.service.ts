import type { CourtRepo, CourtRow } from '../repositories/court.repo.js';
import type { TurfRepo } from '../repositories/turf.repo.js';
import type { MasterRepo } from '../repositories/master.repo.js';
import type { AuditService } from './audit.service.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';

export interface Actor {
  id: string;
  ip?: string | null;
  userAgent?: string | null;
}

export interface CreateCourtInput {
  sportId: string;
  name: string;
  description: string | null;
  capacity: number;
}

export interface UpdateCourtInput {
  sportId?: string;
  name?: string;
  description?: string | null;
  capacity?: number;
}

export function createCourtService(deps: {
  courtRepo: CourtRepo;
  turfRepo: TurfRepo;
  masterRepo: MasterRepo;
  audit: AuditService;
}) {
  const ownTurf = async (turfId: string, ownerId: string) => {
    const turf = await deps.turfRepo.findOwnedBy(turfId, ownerId);
    if (!turf) throw notFound('Turf not found.');
    return turf;
  };

  const assertValidSport = async (turfId: string, sportId: string) => {
    if (!(await deps.masterRepo.isActiveSport(sportId))) {
      throw badRequest('Sport must be an active sports master item.');
    }
    if (!(await deps.masterRepo.turfSupportsSport(turfId, sportId))) {
      throw badRequest('The turf must support the selected sport.');
    }
  };

  return {
    /** Owner creates a court on their own turf (spec section 11). */
    async create(ownerId: string, turfId: string, input: CreateCourtInput, actor: Actor): Promise<CourtRow> {
      await ownTurf(turfId, ownerId);
      await assertValidSport(turfId, input.sportId);
      const court = await deps.courtRepo.create({ turfId, ...input });
      await deps.audit.log({
        actor,
        action: 'COURT_CREATE',
        entityType: 'courts',
        entityId: court.id,
        oldValue: null,
        newValue: { ...input, turfId },
      });
      return court;
    },

    async list(ownerId: string, turfId: string): Promise<CourtRow[]> {
      await ownTurf(turfId, ownerId);
      return deps.courtRepo.listByTurf(turfId);
    },

    /** Owner updates a court; sport changes must still satisfy turf support. */
    async update(ownerId: string, courtId: string, input: UpdateCourtInput, actor: Actor): Promise<CourtRow> {
      const court = await deps.courtRepo.findOwnedById(courtId, ownerId);
      if (!court) throw notFound('Court not found.');
      if (input.sportId !== undefined) await assertValidSport(court.turf_id, input.sportId);
      const updated = await deps.courtRepo.update(courtId, input);
      if (!updated) throw notFound('Court not found.');
      await deps.audit.log({
        actor,
        action: 'COURT_UPDATE',
        entityType: 'courts',
        entityId: courtId,
        oldValue: { ...court },
        newValue: { ...updated },
      });
      return updated;
    },

    /** Owner activates/deactivates a court. */
    async setStatus(ownerId: string, courtId: string, status: 'ACTIVE' | 'INACTIVE', actor: Actor): Promise<CourtRow> {
      const court = await deps.courtRepo.findOwnedById(courtId, ownerId);
      if (!court) throw notFound('Court not found.');
      if (court.status === status) {
        throw conflict(`Court is already ${status}.`);
      }
      const updated = await deps.courtRepo.setStatus(courtId, status);
      if (!updated) throw notFound('Court not found.');
      await deps.audit.log({
        actor,
        action: status === 'ACTIVE' ? 'COURT_ACTIVATE' : 'COURT_DEACTIVATE',
        entityType: 'courts',
        entityId: courtId,
        oldValue: { status: court.status },
        newValue: { status },
      });
      return updated;
    },
  };
}

export type CourtService = ReturnType<typeof createCourtService>;
