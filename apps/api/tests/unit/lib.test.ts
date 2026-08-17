import { describe, expect, it } from 'vitest';
import { hasPermission, permissionsFor } from '../../src/lib/rbac.js';
import { buildPaginationMeta, buildOrderBy } from '../../src/lib/pagination.js';
import {
  kolkataLocalToUtc,
  dayOfWeekOfDate,
  isWeekend,
  isPastSlot,
  timeToMinutes,
  minutesToTime,
} from '../../src/lib/time.js';

describe('rbac', () => {
  it('grants admin permissions per spec section 6', () => {
    expect(hasPermission('ADMIN', ['owners.activate', 'settings.manage'])).toBe(true);
    expect(hasPermission('ADMIN', ['owners.read'])).toBe(true);
  });

  it('grants owner permissions per spec section 6', () => {
    expect(hasPermission('OWNER', ['bookings.manage', 'earnings.read'])).toBe(true);
  });

  it('denies cross-role permissions', () => {
    expect(hasPermission('OWNER', ['owners.read'])).toBe(false);
    expect(hasPermission('OWNER', ['settings.manage'])).toBe(false);
    expect(hasPermission('ADMIN', ['bookings.manage'])).toBe(false);
  });

  it('passes when any permission matches', () => {
    expect(hasPermission('OWNER', ['owners.read', 'bookings.manage'])).toBe(true);
  });

  it('exposes role permission lists', () => {
    expect(permissionsFor('ADMIN')).toContain('audit-logs.read');
    expect(permissionsFor('OWNER')).toContain('turfs.submit');
  });
});

describe('pagination', () => {
  it('builds pagination metadata', () => {
    expect(buildPaginationMeta(1, 20, 45)).toEqual({ page: 1, limit: 20, total: 45, totalPages: 3 });
    expect(buildPaginationMeta(3, 10, 0).totalPages).toBe(0);
  });

  it('builds safe order-by fragments', () => {
    expect(buildOrderBy('name', 'asc', ['name', 'created_at'])).toEqual({ column: 'name', order: 'asc' });
    expect(buildOrderBy('evil; drop table', 'desc', ['name'])).toEqual({ column: 'created_at', order: 'desc' });
    expect(buildOrderBy(undefined, 'asc', ['name'])).toEqual({ column: 'created_at', order: 'asc' });
  });
});

describe('time (Asia/Kolkata)', () => {
  it('converts Kolkata wall-clock to the correct UTC instant', () => {
    // 2026-08-15 06:00:00 IST == 2026-08-15 00:30:00 UTC
    expect(kolkataLocalToUtc('2026-08-15', '06:00:00').toISOString()).toBe('2026-08-15T00:30:00.000Z');
    // 2026-08-15 00:00:00 IST == 2026-08-14 18:30:00 UTC
    expect(kolkataLocalToUtc('2026-08-15', '00:00').toISOString()).toBe('2026-08-14T18:30:00.000Z');
  });

  it('computes day-of-week from the calendar date', () => {
    // 2026-08-15 is a Saturday
    expect(dayOfWeekOfDate('2026-08-15')).toBe(6);
    // 2026-08-17 is a Monday
    expect(dayOfWeekOfDate('2026-08-17')).toBe(1);
  });

  it('classifies weekday vs weekend', () => {
    expect(isWeekend('2026-08-15')).toBe(true);
    expect(isWeekend('2026-08-17')).toBe(false);
  });

  it('detects past slots', () => {
    const now = new Date('2026-08-15T12:00:00.000Z');
    // 2026-08-15 17:00 IST == 2026-08-15 11:30 UTC (past)
    expect(isPastSlot('2026-08-15', '17:00', now)).toBe(true);
    // 2026-08-15 19:00 IST == 2026-08-15 13:30 UTC (future)
    expect(isPastSlot('2026-08-15', '19:00', now)).toBe(false);
  });

  it('parses and formats times', () => {
    expect(timeToMinutes('06:30:00')).toBe(390);
    expect(minutesToTime(390)).toBe('06:30:00');
  });
});
