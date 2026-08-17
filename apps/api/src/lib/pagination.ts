import { z } from 'zod';

/**
 * Collection query parameters (spec section 31):
 *   page (default 1), limit (default 20, max 100),
 *   search, sort, sortOrder (asc|desc).
 */

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(255).optional(),
  sort: z.string().trim().max(100).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

/**
 * Builds a safe ORDER BY fragment from user-provided sort input.
 * Unknown/unsafe column names fall back to `created_at`.
 */
export function buildOrderBy(
  sort: string | undefined,
  sortOrder: 'asc' | 'desc',
  allowedColumns: readonly string[],
  fallback = 'created_at',
): { column: string; order: 'asc' | 'desc' } {
  const candidate = sort?.trim() || fallback;
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(candidate)) {
    return { column: fallback, order: sortOrder };
  }
  const column = allowedColumns.includes(candidate) ? candidate : fallback;
  return { column, order: sortOrder };
}
