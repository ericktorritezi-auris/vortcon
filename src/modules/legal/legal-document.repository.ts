import { prisma } from '@/shared/database/client';
import type { LegalDocumentType } from '@prisma/client';

export async function findDocumentByType(type: LegalDocumentType) {
  return prisma.legalDocument.findUnique({ where: { type } });
}

export async function findPublishedVersion(type: LegalDocumentType) {
  const document = await prisma.legalDocument.findUnique({
    where: { type },
    include: {
      versions: {
        where: { status: 'PUBLISHED' },
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });

  return document?.versions[0] ?? null;
}

export async function findLatestDraft(type: LegalDocumentType) {
  const document = await prisma.legalDocument.findUnique({
    where: { type },
    include: {
      versions: {
        where: { status: 'DRAFT' },
        orderBy: { version: 'desc' },
        take: 1,
      },
    },
  });

  return document?.versions[0] ?? null;
}

/** Todas as versões de um documento, mais recente primeiro (Seção 137: consultar versões/histórico). */
export async function listVersionsForType(type: LegalDocumentType) {
  const document = await prisma.legalDocument.findUnique({
    where: { type },
    include: { versions: { orderBy: { version: 'desc' } } },
  });

  return document?.versions ?? [];
}
