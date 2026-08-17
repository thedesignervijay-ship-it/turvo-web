/**
 * Asia/Kolkata timezone helpers.
 * India has no daylight saving, so a fixed +05:30 offset is exact.
 * All turf booking dates/times are interpreted in Asia/Kolkata.
 */

export const IST_OFFSET_MINUTES = 330; // +05:30

const pad = (n: number): string => String(n).padStart(2, '0');

/** Current wall-clock date in Kolkata, e.g. "2026-08-15". */
export function kolkataDateStr(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(0, 10);
}

/** Current wall-clock time in Kolkata, e.g. "18:30:00". */
export function kolkataTimeStr(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().slice(11, 19);
}

/**
 * Converts a Kolkata wall-clock (booking_date + time) into the corresponding
 * UTC instant. Example: 2026-08-15 06:00:00 IST -> 2026-08-15T00:30:00Z.
 */
export function kolkataLocalToUtc(date: string, time: string): Date {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  const [hh = 0, mm = 0, ss = 0] = time.split(':').map(Number);
  const utc = Date.UTC(y, m - 1, d, hh, mm, ss);
  return new Date(utc - IST_OFFSET_MINUTES * 60_000);
}

/** Day of week (0=Sunday .. 6=Saturday) of a calendar date. */
export function dayOfWeekOfDate(date: string): number {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** True when the calendar date falls on Saturday or Sunday. */
export function isWeekend(date: string): boolean {
  const dow = dayOfWeekOfDate(date);
  return dow === 0 || dow === 6;
}

/** True when the given Kolkata wall-clock instant is strictly in the past. */
export function isPastSlot(date: string, time: string, now: Date = new Date()): boolean {
  return kolkataLocalToUtc(date, time).getTime() < now.getTime();
}

/** Parses "HH:MM(:SS)" into minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [hh = 0, mm = 0, ss = 0] = time.split(':').map(Number);
  return hh * 60 + mm + (ss ? ss / 60 : 0);
}

/** Formats minutes since midnight as "HH:MM:SS". */
export function minutesToTime(totalMinutes: number): string {
  const m = Math.round(totalMinutes);
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${pad(hh)}:${pad(mm)}:00`;
}
