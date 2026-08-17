import type { DbClient } from '../db/client.js';
import type { TurfRepo } from '../repositories/turf.repo.js';
import type { CourtRepo } from '../repositories/court.repo.js';
import type { OperatingHourRepo, OperatingHourRow } from '../repositories/operatingHour.repo.js';
import { createOperatingHourRepo } from '../repositories/operatingHour.repo.js';
import type { AvailabilityRepo } from '../repositories/availability.repo.js';
import type { BookingRepo } from '../repositories/booking.repo.js';
import type { PricingRepo } from '../repositories/pricing.repo.js';
import type { AuditService } from './audit.service.js';
import { serializeAvailabilityBlock } from '../serializers/availability.js';
import { notFound } from '../lib/errors.js';
import {
  dayOfWeekOfDate,
  kolkataLocalToUtc,
  timeToMinutes,
  minutesToTime,
  isWeekend,
} from '../lib/time.js';

export interface Actor {
  id: string;
  ip?: string | null;
  userAgent?: string | null;
}

export function createAvailabilityService(deps: {
  db: DbClient;
  turfRepo: TurfRepo;
  courtRepo: CourtRepo;
  operatingHourRepo: OperatingHourRepo;
  availabilityRepo: AvailabilityRepo;
  bookingRepo: BookingRepo;
  pricingRepo: PricingRepo;
  audit: AuditService;
}) {
  return {
    /** Replaces the weekly operating-hours schedule (section 12). */
    async putOperatingHours(
      ownerId: string,
      turfId: string,
      days: { dayOfWeek: number; openingTime: string; closingTime: string; isClosed: boolean }[],
      actor: Actor,
    ) {
      const turf = await deps.turfRepo.findOwnedBy(turfId, ownerId);
      if (!turf) throw notFound('Turf not found.');

      await deps.db.transaction(async (tx) => {
        const hours = createOperatingHourRepo(tx);
        await hours.replace(tx, turfId, days);
      });

      await deps.audit.log({
        actor,
        action: 'OPERATING_HOURS_UPDATE',
        entityType: 'turfs',
        entityId: turfId,
        oldValue: null,
        newValue: { days },
      });
      return deps.operatingHourRepo.listByTurf(turfId);
    },

    /** Computes slot availability for a date (availability hierarchy, section 12). */
    async availability(ownerId: string, turfId: string, date: string) {
      const turf = await deps.turfRepo.findOwnedBy(turfId, ownerId);
      if (!turf) throw notFound('Turf not found.');

      const hour = (await deps.operatingHourRepo.listByTurf(turfId)).find(
        (h) => h.day_of_week === dayOfWeekOfDate(date),
      );

      const courts = (await deps.courtRepo.listByTurf(turfId)).filter((c) => c.status === 'ACTIVE');
      const slotMinutes = turf.slot_duration_minutes;

      const dayStartUtc = kolkataLocalToUtc(date, '00:00');
      const dayEndUtc = kolkataLocalToUtc(date, '23:59:59');
      const blocks = await deps.availabilityRepo.overlapping(turfId, dayStartUtc, dayEndUtc);

      const courtSlots = [];
      if (hour && !hour.is_closed) {
        const openingMin = timeToMinutes(hour.opening_time);
        const closingMin = timeToMinutes(hour.closing_time);
        for (const court of courts) {
          const slots = [];
          for (let start = openingMin; start + slotMinutes <= closingMin; start += slotMinutes) {
            const startTime = minutesToTime(start);
            const endTime = minutesToTime(start + slotMinutes);
            const slotStartUtc = kolkataLocalToUtc(date, startTime);
            const slotEndUtc = kolkataLocalToUtc(date, endTime);
            const blocked = blocks.some(
              (b) =>
                (b.court_id === null || b.court_id === court.id) &&
                b.start_datetime < slotEndUtc &&
                b.end_datetime > slotStartUtc,
            );
            const booked = blocked
              ? false
              : await deps.bookingRepo.hasConfirmedOverlap({
                  courtId: court.id,
                  bookingDate: date,
                  startTime,
                  endTime,
                });
            const priceRule = await deps.pricingRepo.findActiveForSlot({
              turfId,
              courtId: court.id,
              date,
              startTime,
              endTime,
              dayType: isWeekend(date) ? 'WEEKEND' : 'WEEKDAY',
            });
            slots.push({
              startTime,
              endTime,
              available: !blocked && !booked,
              price: priceRule ? priceRule.price : null,
              currency: priceRule ? priceRule.currency : null,
            });
          }
          courtSlots.push({ courtId: court.id, name: court.name, sportId: court.sport_id, slots });
        }
      } else {
        for (const court of courts) {
          courtSlots.push({ courtId: court.id, name: court.name, sportId: court.sport_id, slots: [] });
        }
      }

      return {
        date,
        slotDurationMinutes: slotMinutes,
        operatingHours: hour
          ? {
              dayOfWeek: hour.day_of_week,
              openingTime: hour.opening_time,
              closingTime: hour.closing_time,
              isClosed: hour.is_closed,
            }
          : null,
        courts: courtSlots,
        blocks: blocks.map(serializeAvailabilityBlock),
      };
    },

    /** Owner records a maintenance/owner/emergency block (section 12). */
    async createBlock(
      ownerId: string,
      turfId: string,
      input: {
        courtId?: string;
        startDateTime: string;
        endDateTime: string;
        blockType: 'MAINTENANCE' | 'OWNER_BLOCK' | 'EMERGENCY';
        reason: string | null;
      },
      actor: Actor,
    ) {
      const turf = await deps.turfRepo.findOwnedBy(turfId, ownerId);
      if (!turf) throw notFound('Turf not found.');

      if (input.courtId) {
        const court = await deps.courtRepo.findOwnedById(input.courtId, ownerId);
        if (!court || court.turf_id !== turfId) throw notFound('Court not found on this turf.');
      }

      const block = await deps.availabilityRepo.create({
        turfId,
        courtId: input.courtId ?? null,
        startDatetime: input.startDateTime,
        endDatetime: input.endDateTime,
        blockType: input.blockType,
        reason: input.reason,
        createdBy: actor.id,
      });
      await deps.audit.log({
        actor,
        action: 'AVAILABILITY_BLOCK_CREATE',
        entityType: 'availability_blocks',
        entityId: block.id,
        oldValue: null,
        newValue: { ...input, turfId },
      });
      return block;
    },

    /** Owner removes an availability block. */
    async deleteBlock(ownerId: string, blockId: string, actor: Actor) {
      const block = await deps.availabilityRepo.findOwnedById(blockId, ownerId);
      if (!block) throw notFound('Availability block not found.');
      await deps.availabilityRepo.deleteOwnedById(blockId, ownerId);
      await deps.audit.log({
        actor,
        action: 'AVAILABILITY_BLOCK_DELETE',
        entityType: 'availability_blocks',
        entityId: blockId,
        oldValue: { ...block },
        newValue: null,
      });
    },
  };
}

export type AvailabilityService = ReturnType<typeof createAvailabilityService>;
