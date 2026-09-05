import type { LegalDocumentType, LegalDocumentVersion } from '@prisma/client';
import { prisma } from '@/shared/database/client';

const REQUIRED_DOCUMENT_TYPES: LegalDocumentType[] = ['PRIVACY_POLICY', 'TERMS_OF_USE'];

interface AcceptanceEvidence {
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Registra o aceite (Seção 133) — nunca um booleano solto. Idempotente: se o
 * usuário já aceitou esta versão exata, não lança erro nem duplica (a
 * constraint única em [userId, documentVersionId] protege isso).
 */
export async function recordAcceptance(
  tenantId: string,
  userId: string,
  documentVersionId: string,
  evidence: AcceptanceEvidence,
): Promise<void> {
  await prisma.legalAcceptance.upsert({
    where: { userId_documentVersionId: { userId, documentVersionId } },
    create: {
      tenantId,
      userId,
      documentVersionId,
      ipAddress: evidence.ipAddress,
      userAgent: evidence.userAgent,
    },
    update: {},
  });
}

export interface PendingAcceptance {
  type: LegalDocumentType;
  versionId: string;
  version: number;
}

/**
 * Lista o que falta o usuário aceitar (Seção 135: gate legal). Para cada
 * documento com versão PUBLISHED, considera satisfeito se o usuário aceitou
 * exatamente essa versão, OU quando a versão atual nao exige novo aceite
 * (Seção 132), se aceitou qualquer versão anterior do mesmo documento.
 */
export async function findPendingAcceptances(userId: string): Promise<PendingAcceptance[]> {
  const pending: PendingAcceptance[] = [];

  for (const type of REQUIRED_DOCUMENT_TYPES) {
    const document = await prisma.legalDocument.findUnique({
      where: { type },
      include: {
        versions: {
          where: { status: { in: ['PUBLISHED', 'ARCHIVED'] } },
          orderBy: { version: 'desc' },
        },
      },
    });

    if (!document) {
      continue;
    }

    const publishedVersion = document.versions.find(
      (version: LegalDocumentVersion) => version.status === 'PUBLISHED',
    );
    if (!publishedVersion) {
      continue;
    }

    const acceptances = await prisma.legalAcceptance.findMany({
      where: { userId, documentVersion: { documentId: document.id } },
      select: { documentVersionId: true },
    });
    const acceptedVersionIds = new Set(
      acceptances.map((acceptance: { documentVersionId: string }) => acceptance.documentVersionId),
    );

    if (acceptedVersionIds.has(publishedVersion.id)) {
      continue;
    }

    const satisfiedByOlderAcceptance =
      !publishedVersion.requiresReacceptance &&
      document.versions.some((version: LegalDocumentVersion) => acceptedVersionIds.has(version.id));

    if (satisfiedByOlderAcceptance) {
      continue;
    }

    pending.push({ type, versionId: publishedVersion.id, version: publishedVersion.version });
  }

  return pending;
}

export async function hasAcceptedAllRequiredDocuments(userId: string): Promise<boolean> {
  const pending = await findPendingAcceptances(userId);
  return pending.length === 0;
}
