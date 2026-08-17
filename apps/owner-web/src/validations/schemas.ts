import {
  collect,
  email,
  endAfterStart,
  endDateOnOrAfterStart,
  maxLength,
  nonNegativeNumber,
  password,
  phone,
  pincode,
  required,
  time,
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

/** Profile update (name + phone). */
export function validateProfile(values: { name: string; phone: string }): FieldErrors {
  return collect({
    name: required(values.name, 'Name') ?? maxLength(values.name, 120, 'Name'),
    phone: phone(values.phone),
  });
}

/** Owner registration (spec section 34: registration form). */
export function validateRegister(values: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  businessName: string;
  businessPhone: string;
  businessEmail?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}): FieldErrors {
  return collect({
    name: required(values.name, 'Name') ?? maxLength(values.name, 120, 'Name'),
    email: required(values.email, 'Email') ?? email(values.email),
    password: password(values.password),
    confirmPassword:
      required(values.confirmPassword, 'Confirm password') ??
      (values.confirmPassword !== values.password ? 'Passwords do not match.' : undefined),
    phone: required(values.phone, 'Phone') ?? phone(values.phone),
    businessName: required(values.businessName, 'Business name') ?? maxLength(values.businessName, 150, 'Business name'),
    businessPhone: required(values.businessPhone, 'Business phone') ?? phone(values.businessPhone),
    businessEmail: values.businessEmail ? email(values.businessEmail, 'Business email') : undefined,
    addressLine1: required(values.addressLine1, 'Address line 1') ?? maxLength(values.addressLine1, 255, 'Address line 1'),
    addressLine2: values.addressLine2 ? maxLength(values.addressLine2, 255, 'Address line 2') : undefined,
    city: required(values.city, 'City') ?? maxLength(values.city, 100, 'City'),
    state: required(values.state, 'State') ?? maxLength(values.state, 100, 'State'),
    pincode: required(values.pincode, 'Pincode') ?? pincode(values.pincode),
  });
}

export function validateTurf(values: {
  name: string;
  description: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  contactPhone: string;
  contactEmail?: string;
  sportIds: string[];
}): FieldErrors {
  return collect({
    name: required(values.name, 'Name') ?? maxLength(values.name, 150, 'Name'),
    description: required(values.description, 'Description') ?? maxLength(values.description, 2000, 'Description'),
    addressLine1: required(values.addressLine1, 'Address line 1') ?? maxLength(values.addressLine1, 255, 'Address line 1'),
    addressLine2: values.addressLine2 ? maxLength(values.addressLine2, 255, 'Address line 2') : undefined,
    city: required(values.city, 'City') ?? maxLength(values.city, 100, 'City'),
    state: required(values.state, 'State') ?? maxLength(values.state, 100, 'State'),
    pincode: required(values.pincode, 'Pincode') ?? pincode(values.pincode),
    contactPhone: required(values.contactPhone, 'Contact phone') ?? phone(values.contactPhone),
    contactEmail: values.contactEmail ? email(values.contactEmail, 'Contact email') : undefined,
    sportIds:
      values.sportIds.length === 0 ? 'At least one sport is required.' : undefined,
  });
}

export function validateCourt(values: {
  sportId: string;
  name: string;
  description?: string;
  capacity?: string;
}): FieldErrors {
  const capacity = values.capacity !== undefined && values.capacity !== '' ? Number(values.capacity) : undefined;
  return collect({
    sportId: required(values.sportId, 'Sport'),
    name: required(values.name, 'Name') ?? maxLength(values.name, 100, 'Name'),
    description: values.description ? maxLength(values.description, 1000, 'Description') : undefined,
    capacity:
      capacity !== undefined && (!Number.isFinite(capacity) || capacity < 0 || !Number.isInteger(capacity))
        ? 'Capacity must be a whole number of 0 or more.'
        : undefined,
  });
}

export function validatePricingRule(values: {
  courtId?: string;
  startTime: string;
  endTime: string;
  dayType: string;
  price: string;
  effectiveFrom: string;
  effectiveTo?: string;
}): FieldErrors {
  const price = values.price !== '' ? Number(values.price) : undefined;
  return collect({
    startTime: required(values.startTime, 'Start time') ?? time(values.startTime, 'Start time'),
    endTime: required(values.endTime, 'End time') ?? time(values.endTime, 'End time'),
    dayType: required(values.dayType, 'Day type'),
    price:
      required(values.price, 'Price') ??
      (price === undefined || !Number.isFinite(price) || price <= 0
        ? 'Price must be greater than zero.'
        : undefined),
    effectiveFrom: required(values.effectiveFrom, 'Effective from'),
    ...endAfterStart(values.startTime, values.endTime, 'endTime'),
    ...endDateOnOrAfterStart(values.effectiveFrom, values.effectiveTo || undefined, 'effectiveTo'),
  });
}

export function validateBooking(values: {
  courtId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  bookingSource: string;
  discountAmount?: string;
}): FieldErrors {
  const discount = values.discountAmount !== undefined && values.discountAmount !== '' ? Number(values.discountAmount) : 0;
  return collect({
    courtId: required(values.courtId, 'Court'),
    bookingDate: required(values.bookingDate, 'Date'),
    startTime: required(values.startTime, 'Start time') ?? time(values.startTime, 'Start time'),
    endTime: required(values.endTime, 'End time') ?? time(values.endTime, 'End time'),
    customerName: required(values.customerName, 'Customer name') ?? maxLength(values.customerName, 120, 'Customer name'),
    customerPhone: required(values.customerPhone, 'Customer phone') ?? phone(values.customerPhone),
    bookingSource: required(values.bookingSource, 'Booking source'),
    discountAmount: nonNegativeNumber(Number.isFinite(discount) ? discount : undefined, 'Discount'),
    ...endAfterStart(values.startTime, values.endTime, 'endTime'),
  });
}

export function validateOperatingHours(days: {
  dayOfWeek: number;
  openingTime: string;
  closingTime: string;
  isClosed: boolean;
}[]): Record<number, FieldErrors> {
  const errors: Record<number, FieldErrors> = {};
  for (const day of days) {
    const collected = collect({
      openingTime: required(day.openingTime, 'Opening time') ?? time(day.openingTime, 'Opening time'),
      closingTime: required(day.closingTime, 'Closing time') ?? time(day.closingTime, 'Closing time'),
      ...endAfterStart(day.openingTime, day.closingTime, 'closingTime'),
    });
    if (Object.keys(collected).length > 0) errors[day.dayOfWeek] = collected;
  }
  return errors;
}

export function validateAvailabilityBlock(values: {
  courtId?: string;
  startDateTime: string;
  endDateTime: string;
  blockType: string;
  reason?: string;
}): FieldErrors {
  return collect({
    startDateTime: required(values.startDateTime, 'Start date and time'),
    endDateTime: required(values.endDateTime, 'End date and time'),
    blockType: required(values.blockType, 'Block type'),
    reason: values.reason ? maxLength(values.reason, 500, 'Reason') : undefined,
    ...(values.startDateTime && values.endDateTime && values.startDateTime >= values.endDateTime
      ? { startDateTime: 'Start must be earlier than end.' }
      : {}),
  });
}

export function validateBusinessProfile(values: {
  businessName: string;
  businessPhone: string;
  businessEmail?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
}): FieldErrors {
  return collect({
    businessName: required(values.businessName, 'Business name') ?? maxLength(values.businessName, 150, 'Business name'),
    businessPhone: required(values.businessPhone, 'Business phone') ?? phone(values.businessPhone),
    businessEmail: values.businessEmail ? email(values.businessEmail, 'Business email') : undefined,
    addressLine1: required(values.addressLine1, 'Address line 1') ?? maxLength(values.addressLine1, 255, 'Address line 1'),
    addressLine2: values.addressLine2 ? maxLength(values.addressLine2, 255, 'Address line 2') : undefined,
    city: required(values.city, 'City') ?? maxLength(values.city, 100, 'City'),
    state: required(values.state, 'State') ?? maxLength(values.state, 100, 'State'),
    pincode: required(values.pincode, 'Pincode') ?? pincode(values.pincode),
  });
}

export type { FieldErrors };
