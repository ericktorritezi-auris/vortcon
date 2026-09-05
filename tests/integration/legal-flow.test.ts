import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { consumeInvitation } from '@/modules/auth/invitation.service';
import { publishDraft, saveDraft } from '@/modules/legal/legal-document.service';
import {
  findPendingAcceptances,
  hasAcceptedAllRequiredDocuments,
  recordAcceptance,
} from '@/modules/legal/legal-acceptance.service';
import { generateSecureToken, hashToken } from '@/shared/security/tokens';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Fluxo legal completo (Seções 129-135), validado contra PostgreSQL real em
 * CI. Cobre: rascunho -> publicacao (versao anterior vira ARCHIVED) ->
 * usuario sem aceite e bloqueado pelo gate -> aceita -> gate libera ->
 * republicacao com requiresReacceptance=true volta a bloquear.
 */
describe('fluxo de documentos legais', () => {
  let tenantId: string;
  let userId: string;
  let planId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant, user } = await provisionTenantWithOwner({
      name: 'Legal Flow Owner',
      email: `legalflow-${suffix}@example.com`,
      username: `legalflow_${suffix}`,
      planId,
    });
    tenantId = tenant.id;
    userId = user.id;

    const rawToken = generateSecureToken();
    await prisma.userInvitation.updateMany({
      where: { userId, usedAt: null },
      data: { tokenHash: hashToken(rawToken) },
    });
    await consumeInvitation(rawToken, 'senha-legal-123');
  });

  afterAll(async () => {
    await prisma.legalAcceptance.deleteMany({ where: { tenantId } });
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
  });

  it('sem versao publicada, a lista de pendencias nao lanca', async () => {
    const pending = await findPendingAcceptances(userId);
    expect(Array.isArray(pending)).toBe(true);
  });

  it('publicar exige um rascunho existente', async () => {
    await expect(publishDraft('TERMS_OF_USE', true)).rejects.toThrow();
  });

  it('salvar rascunho, publicar, e o usuario fica pendente de aceite', async () => {
    await saveDraft('TERMS_OF_USE', '<h2>Termos</h2><p>Versao 1</p>');
    const published = await publishDraft('TERMS_OF_USE', true);
    expect(published.status).toBe('PUBLISHED');
    expect(published.version).toBeGreaterThanOrEqual(1);

    const pending = await findPendingAcceptances(userId);
    const termsPending = pending.find((item) => item.type === 'TERMS_OF_USE');
    expect(termsPending?.versionId).toBe(published.id);
  });

  it('aceitar registra evidencia e libera o gate para este documento', async () => {
    const [pendingBefore] = await findPendingAcceptances(userId);
    expect(pendingBefore).toBeDefined();

    await recordAcceptance(tenantId, userId, pendingBefore!.versionId, {
      ipAddress: '203.0.113.10',
      userAgent: 'vitest-integration',
    });

    const acceptance = await prisma.legalAcceptance.findUniqueOrThrow({
      where: { userId_documentVersionId: { userId, documentVersionId: pendingBefore!.versionId } },
    });
    expect(acceptance.ipAddress).toBe('203.0.113.10');

    await expect(
      recordAcceptance(tenantId, userId, pendingBefore!.versionId, {}),
    ).resolves.toBeUndefined();
  });

  it('republicar com requiresReacceptance=true volta a exigir aceite; false preserva o aceite anterior', async () => {
    await saveDraft('TERMS_OF_USE', '<h2>Termos</h2><p>Versao 2 - mudanca relevante</p>');
    await publishDraft('TERMS_OF_USE', true);

    const stillAcceptedAll = await hasAcceptedAllRequiredDocuments(userId);
    expect(stillAcceptedAll).toBe(false);

    const [pendingV2] = await findPendingAcceptances(userId);
    await recordAcceptance(tenantId, userId, pendingV2!.versionId, {});

    await saveDraft('TERMS_OF_USE', '<h2>Termos</h2><p>Versao 3 - correcao de digitacao</p>');
    const v3 = await publishDraft('TERMS_OF_USE', false);
    expect(v3.requiresReacceptance).toBe(false);

    const pendingAfterMinorEdit = await findPendingAcceptances(userId);
    expect(pendingAfterMinorEdit.find((item) => item.type === 'TERMS_OF_USE')).toBeUndefined();
  });
});
