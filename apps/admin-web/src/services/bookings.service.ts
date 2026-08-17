import { apiClient } from '../lib/apiClient.js';
import type { QueryParams, RowsPage } from '../types/api.js';
import type { BookingStatus } from '@turvo/shared';
import type { BookingDto } from '../types/domain.js';

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

/** GET /bookings — all bookings for admins with filters. */
export async function listBookings(params: BookingListParams): Promise<RowsPage<BookingDto>> {
  return apiClient.get<RowsPage<BookingDto>>('/bookings', params as unknown as QueryParams);
}

/** GET /bookings/:id — booking detail. */
export async function getBooking(bookingId: string): Promise<BookingDto> {
  return apiClient.get<BookingDto>(`/bookings/${bookingId}`);
}
