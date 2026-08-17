export const TURF_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type TurfStatus = (typeof TURF_STATUS)[keyof typeof TURF_STATUS];

export const TURF_APPROVAL_STATUS = {
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_REVIEW: 'UNDER_REVIEW',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type TurfApprovalStatus =
  (typeof TURF_APPROVAL_STATUS)[keyof typeof TURF_APPROVAL_STATUS];

export const COURT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type CourtStatus = (typeof COURT_STATUS)[keyof typeof COURT_STATUS];

export const OWNER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type OwnerStatus = (typeof OWNER_STATUS)[keyof typeof OWNER_STATUS];

export const MASTER_ITEM_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type MasterItemStatus =
  (typeof MASTER_ITEM_STATUS)[keyof typeof MASTER_ITEM_STATUS];

export const PRICING_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;

export type PricingStatus =
  (typeof PRICING_STATUS)[keyof typeof PRICING_STATUS];
