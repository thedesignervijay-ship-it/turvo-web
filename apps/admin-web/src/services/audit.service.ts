import { apiClient } from '../lib/apiClient.js';
import type { QueryParams, RowsPage } from '../types/api.js';
import type { AuditLogDto } from '../types/domain.js';

export interface AuditListParams {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  search?: string;
  sort?: string;
  sortOrder?: 'asc' | 'desc';
}

/** GET /audit-logs — admin audit log with filters and pagination. */
export async function listAuditLogs(params: AuditListParams): Promise<RowsPage<AuditLogDto>> {
  return apiClient.get<RowsPage<AuditLogDto>>('/audit-logs', params as unknown as QueryParams);
}
