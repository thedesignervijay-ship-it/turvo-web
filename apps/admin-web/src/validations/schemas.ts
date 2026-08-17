import {
  collect,
  email,
  endDateOnOrAfterStart,
  maxLength,
  nonNegativeNumber,
  phone,
  reason,
  required,
  type FieldErrors,
} from './validators.js';

/** Login form (Supabase Auth email/password). */
export function validateLogin(values: { email: string; password: string }): FieldErrors {
  return collect({
    email: required(values.email, 'Email') ?? email(values.email),
    password: required(values.password, 'Password'),
  });
}

/** Forgot-password form. */
export function validateForgotPassword(values: { email: string }): FieldErrors {
  return collect({ email: required(values.email, 'Email') ?? email(values.email) });
}

/** Profile update (name + phone; the profile schema backend accepts more). */
export function validateProfile(values: { name: string; phone: string }): FieldErrors {
  return collect({
    name: required(values.name, 'Name') ?? maxLength(values.name, 120, 'Name'),
    phone: phone(values.phone),
  });
}

/** Master data item create/update. */
export function validateMasterItem(values: {
  name: string;
  description?: string | null;
  sortOrder?: number;
}): FieldErrors {
  return collect({
    name: required(values.name, 'Name') ?? maxLength(values.name, 120, 'Name'),
    description: maxLength(values.description ?? undefined, 1000, 'Description'),
    sortOrder: nonNegativeNumber(values.sortOrder, 'Sort order'),
  });
}

/** Turf rejection reason (required by the backend). */
export function validateRejectTurf(values: { reason: string }): FieldErrors {
  return collect({ reason: reason(values.reason) });
}

/** Platform setting value (kept JSON-serializable). */
export function validateSettingValue(value: unknown): string | undefined {
  if (value === null) return undefined;
  const t = typeof value;
  if (t === 'string' || t === 'number' || t === 'boolean') return undefined;
  try {
    JSON.stringify(value);
    return undefined;
  } catch {
    return 'Setting value must be valid JSON.';
  }
}

/** Booking report filters (date range ordering). */
export function validateReportRange(values: { dateFrom?: string; dateTo?: string }): FieldErrors {
  return collect(endDateOnOrAfterStart(values.dateFrom, values.dateTo, 'dateTo'));
}

export type { FieldErrors };
