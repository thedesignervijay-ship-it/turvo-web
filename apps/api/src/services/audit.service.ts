import type { AuditLogRepo, CreateAuditInput } from '../repositories/auditLog.repo.js';

export interface AuditActor {
  id: string;
  ip?: string | null;
  userAgent?: string | null;
}

export type AuditInput = Omit<CreateAuditInput, 'userId' | 'ipAddress' | 'userAgent'> & {
  actor?: AuditActor | null;
};

export function createAuditService(repo: AuditLogRepo) {
  return {
    /** Appends an immutable audit record (spec section 24). */
    async log(input: AuditInput): Promise<void> {
      await repo.create({
        userId: input.actor?.id ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        oldValue: input.oldValue,
        newValue: input.newValue,
        ipAddress: input.actor?.ip ?? null,
        userAgent: input.actor?.userAgent ?? null,
      });
    },
  };
}

export type AuditService = ReturnType<typeof createAuditService>;
