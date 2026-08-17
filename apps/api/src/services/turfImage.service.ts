import type { TurfRepo } from '../repositories/turf.repo.js';
import type { TurfImageRepo } from '../repositories/turfImage.repo.js';
import type { StorageGateway } from '../supabase/storage.js';
import { TURF_IMAGES_BUCKET } from '../supabase/storage.js';
import { badRequest, conflict, notFound } from '../lib/errors.js';
import type { AuditService } from './audit.service.js';
import { randomUUID } from 'node:crypto';

export interface Actor {
  id: string;
  ip?: string | null;
  userAgent?: string | null;
}

const MAX_IMAGES_PER_TURF = 10;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

export function createTurfImageService(deps: {
  turfRepo: TurfRepo;
  turfImageRepo: TurfImageRepo;
  storage: StorageGateway;
  audit: AuditService;
}) {
  return {
    /** Owner uploads an image for their own turf (spec sections 10, 37). */
    async add(ownerId: string, turfId: string, file: UploadedFile, actor: Actor) {
      const turf = await deps.turfRepo.findOwnedBy(turfId, ownerId);
      if (!turf) throw notFound('Turf not found.');

      const ext = MIME_EXT[file.mimetype];
      if (!ext) throw badRequest('Only JPEG, PNG and WebP images are allowed.');
      if (file.size > MAX_IMAGE_BYTES) throw badRequest('Image must be 5 MB or smaller.');

      const current = await deps.turfImageRepo.countByTurf(turfId);
      if (current >= MAX_IMAGES_PER_TURF) {
        throw conflict('A turf can have at most 10 images.');
      }

      const imageId = randomUUID();
      const storagePath = `turfs/${turfId}/${imageId}.${ext}`;
      await deps.storage.upload({
        bucket: TURF_IMAGES_BUCKET,
        path: storagePath,
        data: file.buffer,
        contentType: file.mimetype,
      });

      const image = await deps.turfImageRepo.create({
        turfId,
        storagePath,
        isPrimary: current === 0,
        sortOrder: current + 1,
      });
      return image;
    },

    async list(ownerId: string, turfId: string) {
      const turf = await deps.turfRepo.findOwnedBy(turfId, ownerId);
      if (!turf) throw notFound('Turf not found.');
      const images = await deps.turfImageRepo.listByTurf(turfId);
      return Promise.all(
        images.map(async (image) => ({
          ...image,
          url: await deps.storage.signedUrl({ bucket: TURF_IMAGES_BUCKET, path: image.storage_path }),
        })),
      );
    },

    /** Owner reorders images and/or sets the primary image. */
    async reorder(ownerId: string, turfId: string, input: { imageIds: string[]; primaryImageId?: string }, actor: Actor) {
      const turf = await deps.turfRepo.findOwnedBy(turfId, ownerId);
      if (!turf) throw notFound('Turf not found.');

      const images = await deps.turfImageRepo.listByTurf(turfId);
      const existingIds = new Set(images.map((i) => i.id));
      if (input.imageIds.length !== images.length || input.imageIds.some((id) => !existingIds.has(id))) {
        throw badRequest('Image list must contain every image of this turf exactly once.');
      }
      if (input.primaryImageId && !existingIds.has(input.primaryImageId)) {
        throw badRequest('Primary image must belong to this turf.');
      }

      await deps.turfImageRepo.updateOrder(turfId, input.imageIds);
      if (input.primaryImageId) {
        await deps.turfImageRepo.setPrimary(turfId, input.primaryImageId);
      }
      const updated = await deps.turfImageRepo.listByTurf(turfId);
      return Promise.all(
        updated.map(async (image) => ({
          ...image,
          url: await deps.storage.signedUrl({ bucket: TURF_IMAGES_BUCKET, path: image.storage_path }),
        })),
      );
    },

    /** Owner removes an image; if it was primary the next image is promoted. */
    async remove(ownerId: string, turfId: string, imageId: string, actor: Actor) {
      const turf = await deps.turfRepo.findOwnedBy(turfId, ownerId);
      if (!turf) throw notFound('Turf not found.');
      const image = await deps.turfImageRepo.findByTurfAndId(turfId, imageId);
      if (!image) throw notFound('Image not found.');

      const wasPrimary = image.is_primary;
      await deps.turfImageRepo.delete(imageId);
      await deps.storage.remove({ bucket: TURF_IMAGES_BUCKET, path: image.storage_path });
      if (wasPrimary && (await deps.turfImageRepo.countByTurf(turfId)) > 0) {
        await deps.turfImageRepo.promoteFirst(turfId);
      }
    },
  };
}

export type TurfImageService = ReturnType<typeof createTurfImageService>;
