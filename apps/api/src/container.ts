import type { DbClient } from './db/client.js';
import { createUserRepo } from './repositories/user.repo.js';
import { createOwnerRepo } from './repositories/owner.repo.js';
import { createNotificationRepo } from './repositories/notification.repo.js';
import { createAuditLogRepo } from './repositories/auditLog.repo.js';
import { createAuthService } from './services/auth.service.js';
import { createAuditService } from './services/audit.service.js';
import { createOwnerService } from './services/owner.service.js';
import { createTurfService } from './services/turf.service.js';
import { createTurfImageService } from './services/turfImage.service.js';
import { createCourtService } from './services/court.service.js';
import { createAvailabilityService } from './services/availability.service.js';
import { createPricingService } from './services/pricing.service.js';
import { createMasterDataService } from './services/masterData.service.js';
import { createBookingService } from './services/booking.service.js';
import { createNotificationService } from './services/notification.service.js';
import { createReportService } from './services/report.service.js';
import { createSettingsService } from './services/settings.service.js';
import { createReportRepo } from './repositories/report.repo.js';
import { createSettingsRepo } from './repositories/settings.repo.js';
import { createMasterRepo } from './repositories/master.repo.js';
import { createTurfRepo } from './repositories/turf.repo.js';
import { createTurfImageRepo } from './repositories/turfImage.repo.js';
import { createCourtRepo } from './repositories/court.repo.js';
import { createOperatingHourRepo } from './repositories/operatingHour.repo.js';
import { createAvailabilityRepo } from './repositories/availability.repo.js';
import { createBookingRepo } from './repositories/booking.repo.js';
import { createPricingRepo } from './repositories/pricing.repo.js';
import {
  createSupabaseAuthAdmin,
  type AuthAdminGateway,
} from './supabase/authAdmin.js';
import {
  createSupabaseStorageGateway,
  type StorageGateway,
} from './supabase/storage.js';

export interface ContainerOptions {
  /** Injectable for tests; defaults to the Supabase admin client. */
  authAdmin?: AuthAdminGateway;
  /** Injectable for tests; defaults to Supabase Storage. */
  storage?: StorageGateway;
}

export interface Container {
  db: DbClient;
  repos: {
    user: ReturnType<typeof createUserRepo>;
    owner: ReturnType<typeof createOwnerRepo>;
    notification: ReturnType<typeof createNotificationRepo>;
    auditLog: ReturnType<typeof createAuditLogRepo>;
    turf: ReturnType<typeof createTurfRepo>;
    turfImage: ReturnType<typeof createTurfImageRepo>;
    court: ReturnType<typeof createCourtRepo>;
    master: ReturnType<typeof createMasterRepo>;
    operatingHour: ReturnType<typeof createOperatingHourRepo>;
    availability: ReturnType<typeof createAvailabilityRepo>;
    booking: ReturnType<typeof createBookingRepo>;
    pricing: ReturnType<typeof createPricingRepo>;
    report: ReturnType<typeof createReportRepo>;
    settings: ReturnType<typeof createSettingsRepo>;
  };
  services: {
    auth: ReturnType<typeof createAuthService>;
    audit: ReturnType<typeof createAuditService>;
    owner: ReturnType<typeof createOwnerService>;
    turf: ReturnType<typeof createTurfService>;
    turfImage: ReturnType<typeof createTurfImageService>;
    court: ReturnType<typeof createCourtService>;
    availability: ReturnType<typeof createAvailabilityService>;
    pricing: ReturnType<typeof createPricingService>;
    masterData: ReturnType<typeof createMasterDataService>;
    booking: ReturnType<typeof createBookingService>;
    notification: ReturnType<typeof createNotificationService>;
    report: ReturnType<typeof createReportService>;
    settings: ReturnType<typeof createSettingsService>;
  };
}

export function createContainer(db: DbClient, options: ContainerOptions = {}): Container {
  const user = createUserRepo(db);
  const owner = createOwnerRepo(db);
  const notification = createNotificationRepo(db);
  const auditLog = createAuditLogRepo(db);
  const turf = createTurfRepo(db);
  const turfImage = createTurfImageRepo(db);
  const court = createCourtRepo(db);
  const master = createMasterRepo(db);
  const operatingHour = createOperatingHourRepo(db);
  const availability = createAvailabilityRepo(db);
  const booking = createBookingRepo(db);
  const pricing = createPricingRepo(db);
  const report = createReportRepo(db);
  const settings = createSettingsRepo(db);

  const authAdmin = options.authAdmin ?? createSupabaseAuthAdmin();
  const storage = options.storage ?? createSupabaseStorageGateway();

  const audit = createAuditService(auditLog);
  const auth = createAuthService({ db, userRepo: user, ownerRepo: owner, notificationRepo: notification, authAdmin });
  const ownerService = createOwnerService({ db, userRepo: user, ownerRepo: owner, audit });
  const turfService = createTurfService({ db, turfRepo: turf, masterRepo: master, notificationRepo: notification, audit });
  const turfImageService = createTurfImageService({ turfRepo: turf, turfImageRepo: turfImage, storage, audit });
  const courtService = createCourtService({ courtRepo: court, turfRepo: turf, masterRepo: master, audit });
  const availabilityService = createAvailabilityService({
    db,
    turfRepo: turf,
    courtRepo: court,
    operatingHourRepo: operatingHour,
    availabilityRepo: availability,
    bookingRepo: booking,
    pricingRepo: pricing,
    audit,
  });
  const pricingService = createPricingService({
    pricingRepo: pricing,
    turfRepo: turf,
    courtRepo: court,
    audit,
  });
  const masterDataService = createMasterDataService({ db, masterRepo: master, turfRepo: turf, audit });
  const notificationService = createNotificationService(notification);
  const reportService = createReportService(report);
  const settingsService = createSettingsService({ settingsRepo: settings, auditLogRepo: auditLog, audit });
  const bookingService = createBookingService({
    db,
    turfRepo: turf,
    courtRepo: court,
    bookingRepo: booking,
    operatingHourRepo: operatingHour,
    availabilityRepo: availability,
    pricingRepo: pricing,
    notificationRepo: notification,
    audit,
  });

  return {
    db,
    repos: { user, owner, notification, auditLog, turf, turfImage, court, master, operatingHour, availability, booking, pricing, report, settings },
    services: {
      auth,
      audit,
      owner: ownerService,
      turf: turfService,
      turfImage: turfImageService,
      court: courtService,
      availability: availabilityService,
      pricing: pricingService,
      masterData: masterDataService,
      booking: bookingService,
      notification: notificationService,
      report: reportService,
      settings: settingsService,
    },
  };
}
