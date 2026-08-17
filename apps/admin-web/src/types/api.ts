/**
 * API wire types (spec section 30) — success/error envelopes and pagination.
 */

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiErrorBody {
  success: false;
  error: ApiErrorDetail;
}

/** Collection response for owners/turfs (sendPaginated). */
export interface Paginated {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Collection response for bookings/master-data/notifications/audit/reports. */
export interface RowsPage<T> {
  rows: T[];
  total: number;
  page: number;
  limit: number;
}

export type ApiListResponse<T> = {
  rows: T[];
  total: number;
  page: number;
  limit: number;
};

export interface QueryParams {
  [key: string]: string | number | boolean | null | undefined;
}
