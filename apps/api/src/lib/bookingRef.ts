import { randomBytes } from 'node:crypto';

/** Generates a unique booking reference like TVO-20260815-4F2A9C (<= 30 chars). */
export function generateBookingReference(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `TVO-${date}-${suffix}`;
}
