import type { AuditActorType } from '@prisma/client';
import { prisma } from '@/shared/database/client';

interface RecordAuditEventInput {
  actorType: AuditActorType;
  actorId?: string;
  tenantId?: string;
  eventType: string;
  entityType: string;
  entityId?: string;
  /**
   * Metadados seguros para o Admin ver (Seção 147). NUNCA incluir: valor,
   * descrição, categoria, tag, nota, saldo — ou qualquer outro dado
   * financeiro privado do tenant. Quem chama `recordAuditEvent` é
   * responsável por essa disciplina; o modelo não valida isso sozinho.
   */
  metadataSanitized?: Record<string, unknown>;
}

export async function recordAuditEvent(input: RecordAuditEventInput): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      actorType: input.actorType,
      actorId: input.actorId,
      tenantId: input.tenantId,
      eventType: input.eventType,
      entityType: input.entityType,
      entityId: input.entityId,
      metadataSanitized: input.metadataSanitized,
    },
  });
}

export async function listAuditEventsForTenant(tenantId: string) {
  return prisma.auditEvent.findMany({
    where: { tenantId, visibility: 'ADMIN' },
    orderBy: { createdAt: 'desc' },
  });
}
