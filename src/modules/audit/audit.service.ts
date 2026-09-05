import type { AuditActorType, Prisma } from '@prisma/client';
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
   *
   * Tipado como `Prisma.InputJsonValue` (não `Record<string, unknown>`) de
   * propósito — é o tipo que o campo `Json?` do Prisma realmente aceita;
   * `Record<string, unknown>` falha a checagem de tipo do Prisma mesmo
   * quando o valor em runtime é um JSON válido (só aparece com o Prisma
   * Client gerado de verdade, por isso não foi pego antes no sandbox).
   */
  metadataSanitized?: Prisma.InputJsonValue;
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
