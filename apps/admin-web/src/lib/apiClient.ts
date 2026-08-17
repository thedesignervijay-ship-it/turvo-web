import { env } from '../env.js';
import type { ApiErrorBody, ApiSuccessEnvelope, QueryParams } from '../types/api.js';

/**
 * Central API client (spec section 32). Every /api/v1 request goes through
 * here so auth injection, error decoding and session-expiry handling happen
 * exactly once.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions {
  query?: QueryParams;
  body?: unknown;
  /** Raw body override (used by the CSV download). */
  raw?: boolean;
}

export function buildQueryString(query: QueryParams | undefined): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

type TokenProvider = () => string | null;
type UnauthorizedHandler = () => void;

let accessToken: TokenProvider = () => null;
let onUnauthorized: UnauthorizedHandler = () => {};

/** Called by AuthContext when a session is established/cleared. */
export function setApiTokenProvider(provider: TokenProvider): void {
  accessToken = provider;
}

/** Called by AuthContext when the API reports an expired session (401). */
export function setApiUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

async function parseError(response: Response): Promise<ApiError> {
  let code = 'UNKNOWN';
  let message = `Request failed with status ${response.status}.`;
  let details: unknown;
  try {
    const body = (await response.json()) as ApiErrorBody;
    if (body && body.success === false && body.error) {
      code = body.error.code;
      message = body.error.message;
      details = body.error.details;
    }
  } catch {
    // Non-JSON error body; keep the fallback message.
  }
  return new ApiError(response.status, code, message, details);
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = accessToken();
  const response = await fetch(`${env.apiBaseUrl}${path}${buildQueryString(options.query)}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    if (response.status === 401) onUnauthorized();
    throw await parseError(response);
  }

  if (options.raw) return (await response.blob()) as T;

  const envelope = (await response.json()) as ApiSuccessEnvelope<T>;
  if (!envelope || envelope.success !== true) {
    throw new ApiError(response.status, 'BAD_ENVELOPE', 'Unexpected API response.');
  }
  return envelope.data;
}

export const apiClient = {
  get<T>(path: string, query?: QueryParams): Promise<T> {
    return request<T>('GET', path, { query });
  },

  post<T>(path: string, body?: unknown, query?: QueryParams): Promise<T> {
    return request<T>('POST', path, { body, query });
  },

  patch<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PATCH', path, { body });
  },

  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>('PUT', path, { body });
  },

  delete<T>(path: string): Promise<T> {
    return request<T>('DELETE', path);
  },

  /** Downloads a file (e.g. the booking-report CSV) and triggers a save. */
  async download(path: string, query?: QueryParams, filename = 'download.csv'): Promise<void> {
    const token = accessToken();
    const response = await fetch(`${env.apiBaseUrl}${path}${buildQueryString(query)}`, {
      method: 'GET',
      headers: {
        Accept: 'text/csv, application/octet-stream',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!response.ok) {
      if (response.status === 401) onUnauthorized();
      throw await parseError(response);
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },
};
