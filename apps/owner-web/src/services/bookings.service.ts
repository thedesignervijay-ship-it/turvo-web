import { apiClient } from '../lib/apiClient.js';
import type { QueryParams, RowsPage } from '../types/api.js';
import type { BookingSource, BookingStatus } from '@turvo/shared';
import type { BookingDto, DashboardCountsDto } from '../types/domain.js';

export interface BookingListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: BookingStatus;
  turfId?: string;
  courtId?: string;
  dateFrom?: string;
  dateTo?: string;
  sort?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateBookingInput {
  courtId: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  bookingSource: BookingSource;
  discountAmount?: number;
}

/** GET /bookings — owner-scoped bookings with filters. */
export async function listBookings(params: BookingListParams): Promise<RowsPage<BookingDto>> {
  return apiClient.get<RowsPage<BookingDto>>('/bookings', params as unknown as QueryParams);
}

/** GET /bookings/:id — booking detail. */
export async function getBooking(bookingId: string): Promise<BookingDto> {
  return apiClient.get<BookingDto>(`/bookings/${bookingId}`);
}

/** POST /bookings — owner records a manual booking (PHONE / IN_PERSON). */
export async function createBooking(input: CreateBookingInput): Promise<BookingDto> {
  return apiClient.post<BookingDto>('/bookings', input);
}

/** POST /bookings/:id/cancel — cancel a confirmed booking with a reason. */
export async function cancelBooking(bookingId: string, reason: string): Promise<BookingDto> {
  return apiClient.post<BookingDto>(`/bookings/${bookingId}/cancel`, { reason });
}

/** POST /bookings/:id/complete — complete a confirmed booking. */
export async function completeBooking(bookingId: string): Promise<BookingDto> {
  return apiClient.post<BookingDto>(`/bookings/${bookingId}/complete`);
}

/** GET /bookings/dashboard — booking counts for the owner dashboard. */
export async function dashboardCounts(): Promise<DashboardCountsDto> {
  return apiClient.get<DashboardCountsDto>('/bookings/dashboard');
}
