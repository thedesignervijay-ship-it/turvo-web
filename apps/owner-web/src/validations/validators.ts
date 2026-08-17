/**
 * Client-side validators mirroring the backend Zod schemas
 * (apps/api/src/validations). The backend remains authoritative.
 */

export type FieldErrors = Record<string, string | undefined>;

export function required(value: string | undefined | null, label = 'This field'): string | undefined {
  if (value === undefined || value === null || value.trim() === '') {
    return `${label} is required.`;
  }
  return undefined;
}

export function maxLength(value: string | undefined, max: number, label = 'This field'): string | undefined {
  if (value !== undefined && value !== null && value.trim().length > max) {
    return `${label} must be at most ${max} characters.`;
  }
  return undefined;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function email(value: string | undefined, label = 'Email'): string | undefined {
  if (value === undefined || value === null || value.trim() === '') return undefined;
  if (!EMAIL_RE.test(value.trim())) return `${label} must be a valid email address.`;
  return undefined;
}

const PHONE_RE = /^\+?[0-9]{10,15}$/;

export function phone(value: string | undefined, label = 'Phone'): string | undefined {
  if (value === undefined || value === null || value.trim() === '') return undefined;
  if (!PHONE_RE.test(value.trim())) return `${label} must be 10-15 digits (optional leading +).`;
  return undefined;
}

const PINCODE_RE = /^[0-9]{6}$/;

export function pincode(value: string | undefined): string | undefined {
  if (value === undefined || value === null || value.trim() === '') return undefined;
  if (!PINCODE_RE.test(value.trim())) return 'Pincode must be exactly 6 digits.';
  return undefined;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function date(value: string | undefined, label = 'Date'): string | undefined {
  if (value === undefined || value === null || value.trim() === '') return undefined;
  if (!DATE_RE.test(value.trim())) return `${label} must use YYYY-MM-DD.`;
  return undefined;
}

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

export function time(value: string | undefined, label = 'Time'): string | undefined {
  if (value === undefined || value === null || value.trim() === '') return undefined;
  if (!TIME_RE.test(value.trim())) return `${label} must use HH:MM or HH:MM:SS.`;
  return undefined;
}

export function password(value: string | undefined): string | undefined {
  const err = required(value, 'Password');
  if (err) return err;
  if (value!.length < 8) return 'Password must be at least 8 characters.';
  if (value!.length > 128) return 'Password must be at most 128 characters.';
  return undefined;
}

export function reason(value: string | undefined, label = 'Reason'): string | undefined {
  const err = required(value, label);
  if (err) return err;
  if (value!.trim().length > 500) return `${label} must be at most 500 characters.`;
  return undefined;
}

export function uuid(value: string | undefined, label = 'ID'): string | undefined {
  if (value === undefined || value === null || value.trim() === '') return undefined;
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(value.trim())) return `${label} must be a valid UUID.`;
  return undefined;
}

export function positiveNumber(value: number | undefined, label = 'Value'): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Number.isFinite(value) || value <= 0) return `${label} must be greater than zero.`;
  return undefined;
}

export function nonNegativeNumber(value: number | undefined, label = 'Value'): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Number.isFinite(value) || value < 0) return `${label} must not be negative.`;
  return undefined;
}

export function endAfterStart(
  start: string | undefined,
  end: string | undefined,
  field = 'endTime',
): Record<string, string | undefined> {
  if (start && end && start >= end) {
    return { [field]: `${field === 'endTime' ? 'End time' : 'End'} must be after start.` };
  }
  return {};
}

export function endDateOnOrAfterStart(
  start: string | undefined,
  end: string | undefined,
  field = 'dateTo',
): Record<string, string | undefined> {
  if (start && end && start > end) {
    return { [field]: `${field === 'dateTo' ? 'End date' : 'End date'} must be on or after the start date.` };
  }
  return {};
}

/** Collects the first error per field from the provided validators. */
export function collect(errors: Record<string, string | undefined>): FieldErrors {
  return Object.fromEntries(
    Object.entries(errors).filter(([, value]) => value !== undefined && value !== ''),
  ) as FieldErrors;
}
