import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { internalError } from '../lib/errors.js';

export const TURF_IMAGES_BUCKET = 'turf-images';

export interface StoredObject {
  path: string;
  size: number;
}

/**
 * Backend-only object storage gateway (spec sections 10 and 37). The service
 * role key never leaves the backend; uploads are server-side and owner-scoped.
 */
export interface StorageGateway {
  upload(input: { bucket: string; path: string; data: Buffer; contentType: string }): Promise<StoredObject>;
  remove(input: { bucket: string; path: string }): Promise<void>;
  signedUrl(input: { bucket: string; path: string; expiresInSeconds?: number }): Promise<string>;
}

export function createSupabaseStorageGateway(): StorageGateway {
  const client = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  return {
    async upload({ bucket, path, data, contentType }) {
      const { data: uploaded, error } = await client.storage.from(bucket).upload(path, data, {
        contentType,
        upsert: false,
      });
      if (error) {
        throw internalError(`Storage upload failed: ${error.message}`);
      }
      if (!uploaded?.path) {
        throw internalError('Storage upload returned no path.');
      }
      return { path: uploaded.path, size: data.byteLength };
    },

    async remove({ bucket, path }) {
      const { error } = await client.storage.from(bucket).remove([path]);
      if (error) {
        throw internalError(`Storage delete failed: ${error.message}`);
      }
    },

    async signedUrl({ bucket, path, expiresInSeconds = 3600 }) {
      const { data, error } = await client.storage.from(bucket).createSignedUrl(path, expiresInSeconds);
      if (error) {
        throw internalError(`Storage signed URL failed: ${error.message}`);
      }
      if (!data?.signedUrl) {
        throw internalError('Storage returned no signed URL.');
      }
      return data.signedUrl;
    },
  };
}
