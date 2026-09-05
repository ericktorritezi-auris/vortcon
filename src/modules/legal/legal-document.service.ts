import type { LegalDocumentType, Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { sanitizeLegalContent } from '@/shared/security/sanitize';

/**
 * Cria ou substitui o DRAFT atual de um documento (Seção 130-131). Nunca
 * edita uma versão PUBLISHED — se já existe um DRAFT pendente, ele é
 * atualizado in-place (ainda não publicado, então ainda é seguro editar);
 * se não existe, cria a próxima versão como DRAFT.
 */
export async function saveDraft(type: LegalDocumentType, rawHtml: string) {
  const contentHtml = sanitizeLegalContent(rawHtml);

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const document = await tx.legalDocument.upsert({
      where: { type },
      create: { type },
      update: {},
    });

    const existingDraft = await tx.legalDocumentVersion.findFirst({
      where: { documentId: document.id, status: 'DRAFT' },
    });

    if (existingDraft) {
      return tx.legalDocumentVersion.update({
        where: { id: existingDraft.id },
        data: { contentHtml },
      });
    }

    const lastVersion = await tx.legalDocumentVersion.findFirst({
      where: { documentId: document.id },
      orderBy: { version: 'desc' },
    });

    return tx.legalDocumentVersion.create({
      data: {
        documentId: document.id,
        version: (lastVersion?.version ?? 0) + 1,
        status: 'DRAFT',
        contentHtml,
      },
    });
  });
}

/**
 * Publica o DRAFT atual (Seção 131): a versão publicada anteriormente vira
 * ARCHIVED (nunca é apagada — Seção 133 depende dela para aceites
 * históricos), e o DRAFT vira PUBLISHED, imutável a partir de agora.
 */
export async function publishDraft(type: LegalDocumentType, requiresReacceptance: boolean) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const document = await tx.legalDocument.findUniqueOrThrow({ where: { type } });

    const draft = await tx.legalDocumentVersion.findFirst({
      where: { documentId: document.id, status: 'DRAFT' },
    });

    if (!draft) {
      throw new Error(`Não há rascunho pendente para ${type}.`);
    }

    await tx.legalDocumentVersion.updateMany({
      where: { documentId: document.id, status: 'PUBLISHED' },
      data: { status: 'ARCHIVED' },
    });

    return tx.legalDocumentVersion.update({
      where: { id: draft.id },
      data: { status: 'PUBLISHED', requiresReacceptance, publishedAt: new Date() },
    });
  });
}

export { findPublishedVersion, listVersionsForType } from './legal-document.repository';
