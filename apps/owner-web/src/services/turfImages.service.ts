import { apiClient } from '../lib/apiClient.js';
import type { TurfImageDto } from '../types/domain.js';

/** GET /turfs/:turfId/images — images with signed URLs. */
export async function listImages(turfId: string): Promise<TurfImageDto[]> {
  return apiClient.get<TurfImageDto[]>(`/turfs/${turfId}/images`);
}

/** POST /turfs/:turfId/images — upload one image (multipart, field "image"). */
export async function uploadImage(turfId: string, file: File): Promise<TurfImageDto> {
  const formData = new FormData();
  formData.append('image', file);
  return apiClient.upload<TurfImageDto>(`/turfs/${turfId}/images`, formData);
}

/** PUT /turfs/:turfId/images/order — reorder and/or set the primary image. */
export async function reorderImages(
  turfId: string,
  input: { imageIds: string[]; primaryImageId?: string },
): Promise<TurfImageDto[]> {
  return apiClient.put<TurfImageDto[]>(`/turfs/${turfId}/images/order`, input);
}

/** DELETE /turfs/:turfId/images/:imageId — remove an image. */
export async function removeImage(turfId: string, imageId: string): Promise<null> {
  return apiClient.delete<null>(`/turfs/${turfId}/images/${imageId}`);
}
