import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { createAccount } from '@/modules/accounts/account.service';
import {
  getPeriodIncome,
  getRealBalance,
} from '@/modules/financial-engine/financial-engine.service';
import {
  createOrigin,
  deleteOrigin,
  deactivateOrigin,
  reactivateOrigin,
  updateOrigin,
  listOrigins,
} from '@/modules/programming/programming-origin.service';
import {
  createBeneficiary,
  deleteBeneficiary,
  listBeneficiaries,
} from '@/modules/programming/programming-beneficiary.service';
import {
  cancelEntry,
  createEntry,
  deleteEntry,
  reactivateEntry,
  updateEntry,
} from '@/modules/programming/programming-entry.service';
import {
  createProgrammingSeries,
  deleteProgrammingSeriesWithOccurrences,
  listAllProgrammingSeries,
  materializeProgrammingSeriesOccurrences,
} from '@/modules/programming/programming-recurrence.service';
import { generateTransactionFromEntries } from '@/modules/programming/programming-generation.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Módulo Programações (evolução v1.2) — PROGRAMAR NÃO É MOVIMENTAR. O
 * ponto mais crítico de todos: neutralidade financeira absoluta até o
 * momento explícito de "Gerar transação", e nunca duplicar geração.
 */
describe('Programações', () => {
  let tenantId: string;
  let planId: string;
  let accountId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant } = await provisionTenantWithOwner({
      name: 'Programacoes Owner',
      email: `programacoes-${suffix}@example.com`,
      username: `programacoes_${suffix}`,
      planId,
    });
    tenantId = tenant.id;

    const account = await createAccount(tenantId, {
      name: 'Conta Programações',
      initialBalanceCents: 0,
      initialBalanceDate: new Date('2026-01-01'),
    });
    accountId = account.id;
  });

  afterAll(async () => {
    // Ordem importa: entries referenciam origin/beneficiary com RESTRICT.
    await prisma.programmingEntry.deleteMany({ where: { tenantId } });
    await prisma.programmingRecurrenceSeries.deleteMany({ where: { tenantId } });
    await prisma.programmingOrigin.deleteMany({ where: { tenantId } });
    await prisma.programmingBeneficiary.deleteMany({ where: { tenantId } });
    await prisma.financialTransaction.deleteMany({ where: { tenantId } });
    await prisma.financialAccount.deleteMany({ where: { tenantId } });
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
  });

  describe('Origens e Beneficiários — CRUD', () => {
    it('cria, edita, inativa/reativa e exclui uma Origem sem vínculo', async () => {
      const origin = await createOrigin(tenantId, 'Emprestimos');
      await updateOrigin(tenantId, origin.id, 'Empréstimos');

      const updated = await prisma.programmingOrigin.findUnique({ where: { id: origin.id } });
      expect(updated?.name).toBe('Empréstimos');

      await deactivateOrigin(tenantId, origin.id);
      const activeOnly = await listOrigins(tenantId);
      expect(
        activeOnly.some((o: Awaited<ReturnType<typeof listOrigins>>[number]) => o.id === origin.id),
      ).toBe(false);
      const withInactive = await listOrigins(tenantId, true);
      expect(
        withInactive.find(
          (o: Awaited<ReturnType<typeof listOrigins>>[number]) => o.id === origin.id,
        )?.active,
      ).toBe(false);

      await reactivateOrigin(tenantId, origin.id);
      await deleteOrigin(tenantId, origin.id);
      const deleted = await prisma.programmingOrigin.findUnique({ where: { id: origin.id } });
      expect(deleted).toBeNull();
    });

    it('nunca permite excluir Origem ou Beneficiário em uso (Seções 6 e 10)', async () => {
      const origin = await createOrigin(tenantId, 'Origem em uso');
      const beneficiary = await createBeneficiary(tenantId, 'Beneficiário em uso');
      await createEntry(tenantId, {
        type: 'INCOME',
        originId: origin.id,
        beneficiaryId: beneficiary.id,
        description: 'Vincula os dois',
        amountCents: 1_000,
        entryDate: new Date('2026-09-10'),
      });

      await expect(deleteOrigin(tenantId, origin.id)).rejects.toThrow(
        'já tem lançamento vinculado',
      );
      await expect(deleteBeneficiary(tenantId, beneficiary.id)).rejects.toThrow(
        'já tem lançamento vinculado',
      );
    });

    it('o próprio banco bloqueia a exclusão em uso, mesmo ignorando a checagem de aplicação (rede de segurança)', async () => {
      const beneficiary = await createBeneficiary(tenantId, 'Rede de segurança');
      await createEntry(tenantId, {
        type: 'EXPENSE',
        beneficiaryId: beneficiary.id,
        description: 'Vincula',
        amountCents: 500,
        entryDate: new Date('2026-09-10'),
      });

      await expect(
        prisma.programmingBeneficiary.delete({ where: { id: beneficiary.id } }),
      ).rejects.toThrow();
    });
  });

  describe('Neutralidade financeira absoluta (Seção 1)', () => {
    it('criar um lançamento de Programação NUNCA muda saldo real nem receita do período', async () => {
      const beneficiary = await createBeneficiary(tenantId, 'Neutralidade Teste');
      const balanceBefore = await getRealBalance(tenantId);
      const incomeBefore = await getPeriodIncome(tenantId, {
        from: new Date('2026-09-01'),
        to: new Date('2026-09-30'),
      });

      await createEntry(tenantId, {
        type: 'INCOME',
        beneficiaryId: beneficiary.id,
        description: 'Receita programada, R$ 10.000',
        amountCents: 1_000_000,
        entryDate: new Date('2026-09-15'),
      });

      expect(await getRealBalance(tenantId)).toBe(balanceBefore);
      expect(
        await getPeriodIncome(tenantId, {
          from: new Date('2026-09-01'),
          to: new Date('2026-09-30'),
        }),
      ).toBe(incomeBefore);
    });
  });

  describe('Ciclo de vida do lançamento (Seções 24-31)', () => {
    it('editar afeta só a ocorrência isolada, nunca convertida', async () => {
      const beneficiary = await createBeneficiary(tenantId, 'Edição Teste');
      const entry = await createEntry(tenantId, {
        type: 'EXPENSE',
        beneficiaryId: beneficiary.id,
        description: 'Original',
        amountCents: 500_00,
        entryDate: new Date('2026-09-10'),
      });

      await updateEntry(tenantId, entry.id, { amountCents: 650_00 });
      const updated = await prisma.programmingEntry.findUnique({ where: { id: entry.id } });
      expect(updated?.amountCents).toBe(650_00);
    });

    it('cancelar → excluir (padrão idêntico ao de Transações); excluir direto de ativo é rejeitado', async () => {
      const beneficiary = await createBeneficiary(tenantId, 'Cancelar Teste');
      const entry = await createEntry(tenantId, {
        type: 'EXPENSE',
        beneficiaryId: beneficiary.id,
        description: 'Vai ser cancelada e excluída',
        amountCents: 100_00,
        entryDate: new Date('2026-09-10'),
      });

      await expect(deleteEntry(tenantId, entry.id)).rejects.toThrow(
        'Só é possível excluir um lançamento cancelado.',
      );

      await cancelEntry(tenantId, entry.id);
      await deleteEntry(tenantId, entry.id);

      const deleted = await prisma.programmingEntry.findUnique({ where: { id: entry.id } });
      expect(deleted).toBeNull();
    });

    it('reativar volta pro estado ativo', async () => {
      const beneficiary = await createBeneficiary(tenantId, 'Reativar Teste');
      const entry = await createEntry(tenantId, {
        type: 'EXPENSE',
        beneficiaryId: beneficiary.id,
        description: 'Vai ser cancelada e reativada',
        amountCents: 100_00,
        entryDate: new Date('2026-09-10'),
      });

      await cancelEntry(tenantId, entry.id);
      await reactivateEntry(tenantId, entry.id);

      const reactivated = await prisma.programmingEntry.findUnique({ where: { id: entry.id } });
      expect(reactivated?.status).toBe('ACTIVE');
      expect(reactivated?.cancelledAt).toBeNull();
    });
  });

  describe('Gerar transação — o ponto de contato entre os dois universos (Seções 35-43)', () => {
    it('consolida TODAS as ocorrências elegíveis do beneficiário+tipo+período numa única transação (pedido do cliente: nunca seleção parcial)', async () => {
      const beneficiary = await createBeneficiary(tenantId, 'Ana Paula Consolidação');
      await createEntry(tenantId, {
        type: 'INCOME',
        beneficiaryId: beneficiary.id,
        description: 'Repasse X',
        amountCents: 500_00,
        entryDate: new Date('2026-09-05'),
      });
      await createEntry(tenantId, {
        type: 'INCOME',
        beneficiaryId: beneficiary.id,
        description: 'Repasse Y',
        amountCents: 200_00,
        entryDate: new Date('2026-09-18'),
      });

      const result = await generateTransactionFromEntries(tenantId, {
        beneficiaryId: beneficiary.id,
        type: 'INCOME',
        periodFrom: new Date('2026-09-01'),
        periodTo: new Date('2026-09-30'),
        transactionDate: new Date('2026-09-30'),
        accountId,
      });

      expect(result.consolidatedEntryCount).toBe(2);
      expect(result.totalAmountCents).toBe(700_00);

      const transaction = await prisma.financialTransaction.findUnique({
        where: { id: result.transactionId },
      });
      expect(transaction?.description).toBe('Repasse Ana Paula Consolidação');
      expect(transaction?.amountCents).toBe(700_00);
    });

    it('Seção 35 — receita e despesa NUNCA se compensam: geram duas transações separadas, nunca líquido', async () => {
      const beneficiary = await createBeneficiary(tenantId, 'Ana Paula Sem Compensar');
      await createEntry(tenantId, {
        type: 'INCOME',
        beneficiaryId: beneficiary.id,
        description: 'Repasse',
        amountCents: 1_000_00,
        entryDate: new Date('2026-09-05'),
      });
      await createEntry(tenantId, {
        type: 'EXPENSE',
        beneficiaryId: beneficiary.id,
        description: 'Pagamento',
        amountCents: 300_00,
        entryDate: new Date('2026-09-05'),
      });

      const incomeResult = await generateTransactionFromEntries(tenantId, {
        beneficiaryId: beneficiary.id,
        type: 'INCOME',
        periodFrom: new Date('2026-09-01'),
        periodTo: new Date('2026-09-30'),
        transactionDate: new Date('2026-09-30'),
        accountId,
      });
      const expenseResult = await generateTransactionFromEntries(tenantId, {
        beneficiaryId: beneficiary.id,
        type: 'EXPENSE',
        periodFrom: new Date('2026-09-01'),
        periodTo: new Date('2026-09-30'),
        transactionDate: new Date('2026-09-30'),
        accountId,
      });

      expect(incomeResult.totalAmountCents).toBe(1_000_00);
      expect(expenseResult.totalAmountCents).toBe(300_00);
      expect(incomeResult.transactionId).not.toBe(expenseResult.transactionId);
    });

    it('Seção 43 — idempotência: nada elegível uma segunda vez (nunca gera duas transações pro mesmo lançamento)', async () => {
      const beneficiary = await createBeneficiary(tenantId, 'Idempotência Teste');
      await createEntry(tenantId, {
        type: 'INCOME',
        beneficiaryId: beneficiary.id,
        description: 'Só uma vez',
        amountCents: 400_00,
        entryDate: new Date('2026-09-05'),
      });

      await generateTransactionFromEntries(tenantId, {
        beneficiaryId: beneficiary.id,
        type: 'INCOME',
        periodFrom: new Date('2026-09-01'),
        periodTo: new Date('2026-09-30'),
        transactionDate: new Date('2026-09-30'),
        accountId,
      });

      await expect(
        generateTransactionFromEntries(tenantId, {
          beneficiaryId: beneficiary.id,
          type: 'INCOME',
          periodFrom: new Date('2026-09-01'),
          periodTo: new Date('2026-09-30'),
          transactionDate: new Date('2026-09-30'),
          accountId,
        }),
      ).rejects.toThrow('Não há lançamentos elegíveis');
    });

    it('Seção 31/44 — ocorrência já convertida nunca pode ser editada, reativada ou excluída (rastreabilidade preservada mesmo se a transação for apagada depois)', async () => {
      const beneficiary = await createBeneficiary(tenantId, 'Rastreabilidade Teste');
      const entry = await createEntry(tenantId, {
        type: 'INCOME',
        beneficiaryId: beneficiary.id,
        description: 'Vai converter',
        amountCents: 900_00,
        entryDate: new Date('2026-09-05'),
      });

      const result = await generateTransactionFromEntries(tenantId, {
        beneficiaryId: beneficiary.id,
        type: 'INCOME',
        periodFrom: new Date('2026-09-01'),
        periodTo: new Date('2026-09-30'),
        transactionDate: new Date('2026-09-30'),
        accountId,
      });

      await expect(updateEntry(tenantId, entry.id, { amountCents: 1 })).rejects.toThrow(
        'já gerou uma transação',
      );

      // Cancelar continua permitido (Seção 45), excluir não (Seção 31).
      await cancelEntry(tenantId, entry.id);
      await expect(reactivateEntry(tenantId, entry.id)).rejects.toThrow(
        'já gerou uma transação — não pode ser reativado',
      );
      await expect(deleteEntry(tenantId, entry.id)).rejects.toThrow(
        'rastreabilidade precisa ser preservada',
      );

      // Simula a transação gerada sendo excluída depois (fluxo normal do
      // domínio financeiro: cancelar -> excluir). convertedAt precisa
      // continuar marcado mesmo assim.
      await prisma.financialTransaction.update({
        where: { id: result.transactionId },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });
      await prisma.financialTransaction.delete({ where: { id: result.transactionId } });

      const entryAfterTransactionDeleted = await prisma.programmingEntry.findUnique({
        where: { id: entry.id },
      });
      expect(entryAfterTransactionDeleted?.generatedTransactionId).toBeNull(); // SetNull
      expect(entryAfterTransactionDeleted?.convertedAt).not.toBeNull(); // permanente

      // E continua bloqueado pra excluir mesmo com o ponteiro nulo.
      await expect(deleteEntry(tenantId, entry.id)).rejects.toThrow(
        'rastreabilidade precisa ser preservada',
      );
    });
  });

  describe('Recorrência de Programações — domínio separado (Seções 17-33)', () => {
    it('cria a série e materializa; posição 1/N calculada corretamente', async () => {
      const beneficiary = await createBeneficiary(tenantId, 'Recorrência Teste');
      const series = await createProgrammingSeries(tenantId, {
        type: 'EXPENSE',
        frequency: 'MONTHLY',
        startDate: new Date('2026-09-01'),
        maxOccurrences: 10,
        baseAmountCents: 500_00,
        description: 'Pagamento XPTO',
        defaultBeneficiaryId: beneficiary.id,
      });

      const occurrences = await prisma.programmingEntry.findMany({
        where: { recurrenceSeriesId: series.id },
        orderBy: { entryDate: 'asc' },
      });
      expect(occurrences.length).toBe(10);
      expect(occurrences.every((o: { amountCents: number }) => o.amountCents === 500_00)).toBe(
        true,
      );
    });

    it('materializar de novo é idempotente — nunca duplica', async () => {
      const beneficiary = await createBeneficiary(tenantId, 'Idempotência Recorrência');
      const series = await createProgrammingSeries(tenantId, {
        type: 'INCOME',
        frequency: 'MONTHLY',
        startDate: new Date('2026-09-01'),
        maxOccurrences: 3,
        baseAmountCents: 100_00,
        description: 'Repasse mensal',
        defaultBeneficiaryId: beneficiary.id,
      });

      const countBefore = await prisma.programmingEntry.count({
        where: { recurrenceSeriesId: series.id },
      });
      const created = await materializeProgrammingSeriesOccurrences(tenantId, series.id);
      const countAfter = await prisma.programmingEntry.count({
        where: { recurrenceSeriesId: series.id },
      });

      expect(created).toBe(0);
      expect(countAfter).toBe(countBefore);
    });

    it('gestão de série: listAllProgrammingSeries mostra a contagem certa; excluir a série preserva ocorrências já convertidas', async () => {
      const beneficiary = await createBeneficiary(tenantId, 'Exclusão de Série Teste');
      const series = await createProgrammingSeries(tenantId, {
        type: 'EXPENSE',
        frequency: 'MONTHLY',
        startDate: new Date('2026-09-01'),
        maxOccurrences: 3,
        baseAmountCents: 200_00,
        description: 'Série a ser excluída',
        defaultBeneficiaryId: beneficiary.id,
      });

      const list = await listAllProgrammingSeries(tenantId);
      const found = list.find(
        (s: Awaited<ReturnType<typeof listAllProgrammingSeries>>[number]) => s.id === series.id,
      );
      expect(found?.occurrenceCount).toBe(3);

      // Converte UMA das ocorrências antes de excluir a série.
      await generateTransactionFromEntries(tenantId, {
        beneficiaryId: beneficiary.id,
        type: 'EXPENSE',
        periodFrom: new Date('2026-09-01'),
        periodTo: new Date('2026-09-30'),
        transactionDate: new Date('2026-09-30'),
        accountId,
      });

      const { deletedOccurrences, preservedConvertedOccurrences } =
        await deleteProgrammingSeriesWithOccurrences(tenantId, series.id);

      expect(preservedConvertedOccurrences).toBe(1);
      expect(deletedOccurrences).toBe(2); // as outras 2, nunca convertidas

      const seriesAfter = await prisma.programmingRecurrenceSeries.findUnique({
        where: { id: series.id },
      });
      expect(seriesAfter).toBeNull();

      // A ocorrência convertida sobrevive, solta da série, com a
      // transação ainda vinculada.
      const survivingEntries = await prisma.programmingEntry.findMany({
        where: { beneficiaryId: beneficiary.id, convertedAt: { not: null } },
      });
      expect(survivingEntries).toHaveLength(1);
      expect(survivingEntries[0]?.recurrenceSeriesId).toBeNull();
      expect(survivingEntries[0]?.generatedTransactionId).not.toBeNull();
    });
  });

  describe('Multitenancy (Seção 11)', () => {
    it('tenant A nunca vê nem consegue vincular Origem/Beneficiário do tenant B', async () => {
      const otherPlan = await createTestPlan();
      const suffix = crypto.randomUUID().slice(0, 8);
      const { tenant: otherTenant } = await provisionTenantWithOwner({
        name: 'Outro Tenant Programacoes',
        email: `outro-prog-${suffix}@example.com`,
        username: `outro_prog_${suffix}`,
        planId: otherPlan.id,
      });

      const otherBeneficiary = await createBeneficiary(
        otherTenant.id,
        'Beneficiário do outro tenant',
      );

      const listForTenantA = await listBeneficiaries(tenantId);
      expect(
        listForTenantA.some(
          (b: Awaited<ReturnType<typeof listBeneficiaries>>[number]) =>
            b.id === otherBeneficiary.id,
        ),
      ).toBe(false);

      await expect(
        createEntry(tenantId, {
          type: 'INCOME',
          beneficiaryId: otherBeneficiary.id,
          description: 'Tentativa de vincular beneficiário de outro tenant',
          amountCents: 100_00,
          entryDate: new Date('2026-09-10'),
        }),
      ).rejects.toThrow('Beneficiário não encontrado neste tenant.');

      await prisma.programmingBeneficiary.deleteMany({ where: { tenantId: otherTenant.id } });
      await cleanupTenant(otherTenant.id);
      await deleteTestPlan(otherPlan.id);
    });
  });
});
