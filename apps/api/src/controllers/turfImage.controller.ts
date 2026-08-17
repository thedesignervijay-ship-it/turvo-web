import type { Request, Response } from 'express';
import { sendCreated, sendSuccess } from '../lib/http.js';
import { badRequest, forbidden } from '../lib/errors.js';
import type { TurfImageService } from '../services/turfImage.service.js';
import { serializeTurfImage } from '../serializers/turfImage.js';

function ownerIdOf(req: Request): string {
  const ownerId = req.auth!.owner?.id;
  if (!ownerId) throw forbidden('Only a turf owner can manage turf images.');
  return ownerId;
}

export function createTurfImageController(turfImageService: TurfImageService) {
  return {
    list: async (req: Request, res: Response): Promise<void> => {
      const images = await turfImageService.list(ownerIdOf(req), String(req.params.turfId));
      sendSuccess(res, images.map(serializeTurfImage));
    },

    add: async (req: Request, res: Response): Promise<void> => {
      if (!req.file) {
        throw badRequest('Exactly one image file field named "image" is required.');
      }
      const image = await turfImageService.add(ownerIdOf(req), String(req.params.turfId), req.file, {
        id: req.auth!.user.id,
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      });
      sendCreated(res, serializeTurfImage(image), 'Image uploaded successfully.');
    },

    reorder: async (req: Request, res: Response): Promise<void> => {
      const body = req.validated!.body as { imageIds: string[]; primaryImageId?: string };
      const images = await turfImageService.reorder(
        ownerIdOf(req),
        String(req.params.turfId),
        body,
        { id: req.auth!.user.id, ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null },
      );
      sendSuccess(res, images.map(serializeTurfImage), 'Image order updated.');
    },

    remove: async (req: Request, res: Response): Promise<void> => {
      await turfImageService.remove(
        ownerIdOf(req),
        String(req.params.turfId),
        String(req.params.imageId),
        { id: req.auth!.user.id, ip: req.ip ?? null, userAgent: req.headers['user-agent'] ?? null },
      );
      sendSuccess(res, null, 'Image deleted.');
    },
  };
}
