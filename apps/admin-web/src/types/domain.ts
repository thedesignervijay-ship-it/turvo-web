/**
 * Domain DTOs mirroring the backend serializers (apps/api/src/serializers).
 * Keep in sync with the API when the backend contract changes.
 */

import type {
  BookingSource,
  BookingStatus,
  DayType,
  MasterCategoryCode,
  OwnerStatus,
  Role,
  TurfApprovalStatus,
  TurfStatus,
  UserStatus,
} from '@turvo/shared';

export interface UserDto {
  id: string;
  authUserId: string | null;
  role: Role;
  name: string;
  email: string;
  phone: string;
  status: UserStatus;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerDto {
  id: string;
  userId: string;
  businessName: string;
  businessPhone: string;
  businessEmail: string | null;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  status: OwnerStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerWithUserDto extends OwnerDto {
  user: {
    name: string;
    email: string;
    phone: string;
    status: UserStatus;
    lastLoginAt: string | null;
  };
  turfCount?: number;
}

export interface TurfDetailDto {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  contactPhone: string;
  contactEmail: string | null;
  slotDurationMinutes: 30 | 60;
  status: TurfStatus;
  approvalStatus: TurfApprovalStatus;
  rejectionReason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { name: string; businessName: string; status: OwnerStatus };
  courtCount: number;
  sportIds: string[];
}

export interface MasterCategoryRow {
  id: string;
  code: MasterCategoryCode;
  name: string;
  description: string | null;
  created_at: string;
}

export interface MasterItemDto {
  id: string;
  categoryId: string;
  categoryCode: MasterCategoryCode;
  categoryName: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BookingDto {
  id: string;
  bookingReference: string;
  turfId: string;
  turfName: string;
  courtId: string;
  courtName: string;
  sportId: string;
  sportName: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  baseAmount: number;
  discountAmount: number;
  totalAmount: number;
  bookingSource: BookingSource;
  bookingStatus: BookingStatus;
  cancellationReason: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BookingReportDto {
  id: string;
  bookingReference: string;
  turfId: string;
  turfName: string;
  courtId: string;
  courtName: string;
  sportId: string;
  sportName: string;
  ownerId: string;
  ownerName: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  baseAmount: number;
  discountAmount: number;
  totalAmount: number;
  bookingSource: BookingSource;
  bookingStatus: BookingStatus;
  cancellationReason: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface PlatformSettingDto {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogDto {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  oldValue: unknown;
  newValue: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface CourtDto {
  id: string;
  turfId: string;
  sportId: string;
  name: string;
  description: string | null;
  capacity: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface PricingRuleDto {
  id: string;
  turfId: string;
  courtId: string | null;
  startTime: string;
  endTime: string;
  dayType: DayType;
  price: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface OperatingHourDto {
  id: string;
  turfId: string;
  dayOfWeek: number;
  openingTime: string;
  closingTime: string;
  isClosed: boolean;
}

export interface DailySummaryRow {
  date: string;
  count: number;
  value: number;
}

export interface OwnerReportRow {
  ownerId: string;
  businessName: string;
  ownerName: string;
  email: string;
  turfs: number;
  bookings: number;
  completed: number;
  cancelled: number;
  bookingValue: number;
}

export interface TurfReportRow {
  turfId: string;
  turfName: string;
  businessName: string;
  city: string;
  status: TurfStatus;
  approvalStatus: TurfApprovalStatus;
  bookings: number;
  completed: number;
  cancelled: number;
  bookingValue: number;
}

export interface EarningsSummaryDto {
  todayValue: number;
  todayCount: number;
  monthValue: number;
  monthCount: number;
  completedValue: number;
  completedCount: number;
  cancelledValue: number;
  cancelledCount: number;
}

export interface DashboardCountsDto {
  today: number;
  month: number;
  completed: number;
  cancelled: number;
}

export interface AdminDashboardCountsDto {
  totalTurfOwners: number;
  activeTurfOwners: number;
  totalTurfs: number;
  activeTurfs: number;
  pendingTurfs: number;
  totalBookings: number;
  todayBookings: number;
  monthBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  monthRevenue: number;
}

/** GET /auth/me */
export interface MeResponse {
  user: UserDto;
  owner: OwnerDto | null;
  permissions: string[];
}

/** GET /profile */
export interface ProfileResponse {
  user: UserDto;
  owner: OwnerDto | null;
}
