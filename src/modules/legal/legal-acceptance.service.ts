import type { LegalDocumentType, LegalDocumentVersion, User } from '@prisma/client';
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

export interface AcceptanceOverviewRow {
  tenantId: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'REGULARIZADO' | 'PENDENTE';
  acceptedVersion: number | null;
  acceptedAt: Date | null;
}

/**
 * Consulta de aceites para o Admin (Seção 137): regularizados, pendentes,
 * com timestamp. Somente leitura — "Não editar aceite registrado" (Seção
 * 137) é satisfeito por não existir nenhuma mutação aqui, de propósito.
 */
export async function listAcceptanceOverview(
  type: LegalDocumentType,
): Promise<AcceptanceOverviewRow[]> {
  const document = await prisma.legalDocument.findUnique({
    where: { type },
    include: { versions: { where: { status: 'PUBLISHED' } } },
  });

  const publishedVersion = document?.versions[0];

  const owners = await prisma.user.findMany({
    where: { role: 'TENANT_OWNER' },
    include: { tenantMemberships: true },
  });

  const rows: AcceptanceOverviewRow[] = [];

  for (const owner of owners) {
    const tenantId = owner.tenantMemberships[0]?.tenantId;
    if (!tenantId) continue;

    const acceptance = publishedVersion
      ? await prisma.legalAcceptance.findUnique({
          where: {
            userId_documentVersionId: { userId: owner.id, documentVersionId: publishedVersion.id },
          },
        })
      : null;

    rows.push({
      tenantId,
      userId: owner.id,
      userName: owner.name,
      userEmail: owner.email,
      status: acceptance ? 'REGULARIZADO' : 'PENDENTE',
      acceptedVersion: acceptance ? (publishedVersion?.version ?? null) : null,
      acceptedAt: acceptance?.acceptedAt ?? null,
    });
  }

  return rows;
}

export interface AcceptanceHistoryRow {
  userName: string;
  userEmail: string;
  version: number;
  acceptedAt: Date;
  ipAddress: string | null;
}

/** Histórico completo de aceites de um documento, todas as versões (Seção 137: "histórico; timestamps"). */
export async function listAcceptanceHistory(
  type: LegalDocumentType,
): Promise<AcceptanceHistoryRow[]> {
  const acceptances = await prisma.legalAcceptance.findMany({
    where: { documentVersion: { document: { type } } },
    include: { user: true, documentVersion: true },
    orderBy: { acceptedAt: 'desc' },
  });

  return acceptances.map(
    (acceptance: {
      acceptedAt: Date;
      ipAddress: string | null;
      user: User;
      documentVersion: LegalDocumentVersion;
    }) => ({
      userName: acceptance.user.name,
      userEmail: acceptance.user.email,
      version: acceptance.documentVersion.version,
      acceptedAt: acceptance.acceptedAt,
      ipAddress: acceptance.ipAddress,
    }),
  );
}
