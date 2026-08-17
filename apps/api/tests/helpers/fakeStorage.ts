import type { StorageGateway } from '../../src/supabase/storage.js';

export interface StoredObjectEntry {
  path: string;
  data: Buffer;
  contentType: string;
}

export interface FakeStorageGateway extends StorageGateway {
  objects: Map<string, StoredObjectEntry>;
  reset(): void;
}

export function createFakeStorage(): FakeStorageGateway {
  const objects = new Map<string, StoredObjectEntry>();

  return {
    objects,
    reset() {
      objects.clear();
    },
    async upload({ path, data, contentType }) {
      objects.set(path, { path, data, contentType });
      return { path, size: data.byteLength };
    },
    async remove({ path }) {
      objects.delete(path);
    },
    async signedUrl({ path }) {
      return `https://storage.test/${path}`;
    },
  };
}
