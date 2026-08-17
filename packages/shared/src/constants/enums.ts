export const MASTER_CATEGORY_CODE = {
  SPORTS: 'SPORTS',
  FACILITIES: 'FACILITIES',
  RULES: 'RULES',
  EQUIPMENT: 'EQUIPMENT',
} as const;

export type MasterCategoryCode =
  (typeof MASTER_CATEGORY_CODE)[keyof typeof MASTER_CATEGORY_CODE];

export const DAY_OF_WEEK = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
} as const;

export type DayOfWeek = (typeof DAY_OF_WEEK)[keyof typeof DAY_OF_WEEK];

export const SLOT_DURATION_MINUTES = [30, 60] as const;

export type SlotDurationMinutes =
  (typeof SLOT_DURATION_MINUTES)[number];

export const BLOCK_TYPE = {
  MAINTENANCE: 'MAINTENANCE',
  OWNER_BLOCK: 'OWNER_BLOCK',
  EMERGENCY: 'EMERGENCY',
} as const;

export type BlockType = (typeof BLOCK_TYPE)[keyof typeof BLOCK_TYPE];

export const DAY_TYPE = {
  WEEKDAY: 'WEEKDAY',
  WEEKEND: 'WEEKEND',
} as const;

export type DayType = (typeof DAY_TYPE)[keyof typeof DAY_TYPE];

export const BOOKING_SOURCE = {
  PHONE: 'PHONE',
  IN_PERSON: 'IN_PERSON',
} as const;

export type BookingSource =
  (typeof BOOKING_SOURCE)[keyof typeof BOOKING_SOURCE];

export const BOOKING_STATUS = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  COMPLETED: 'COMPLETED',
} as const;

export type BookingStatus =
  (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const DEFAULT_SLOT_DURATION_MINUTES = 60;
export const DEFAULT_CURRENCY = 'INR';
