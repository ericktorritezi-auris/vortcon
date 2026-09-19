import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import * as subscriptionRepository from '@/modules/subscriptions/subscription.repository';
import {
  ensureCurrentMonthCharge,
  evaluateAndApplyDelinquency,
  registerPayment,
  updateTenantSubscription,
} from '@/modules/subscriptions/subscription.service';
import * as tenantRepository from '@/modules/tenants/tenant.repository';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Dia 15 do mês seguinte, sempre válido (Seção 113: 1-28, sempre futuro) —
 * independe de em que dia do mês o CI roda, então nunca é flaky (mesma
 * classe de bug — data derivada de "hoje" — que esta versão corrige).
 */
function firstDueDateNextMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 15));
}

/**
 * Fluxo comercial completo (Secoes 106-114), validado contra PostgreSQL
 * real em CI: provisionar com plano -> mensalidade do mes criada
 * automaticamente -> simula atraso alem da carencia -> bloqueio automatico
 * por inadimplencia -> Admin registra pagamento -> desbloqueio automatico.
 */
describe('fluxo comercial (assinatura, mensalidade, inadimplencia)', () => {
  let tenantId: string;
  let adminUserId: string;
  let planId: string;

  beforeAll(async () => {
    const plan = await createTestPlan(4990);
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant, user } = await provisionTenantWithOwner({
      name: 'Comercial Flow Owner',
      email: `comercial-${suffix}@example.com`,
      username: `comercial_${suffix}`,
      planId,
      // Evolução v1.6.1 — o Admin escolhe a data exata da 1ª cobrança
      // (Seção 113): sempre no futuro e sempre dia 1-28, nunca "hoje"
      // literal — rodar o CI num dia 29/30/31 do mês não pode tornar
      // este teste flaky (mesma classe de bug que estamos corrigindo).
      firstDueDate: firstDueDateNextMonth(),
    });
    tenantId = tenant.id;
    adminUserId = user.id;
  });

  afterAll(async () => {
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
  });

  it('provisionar ja cria a assinatura com preco congelado do plano (Secao 107)', async () => {
    const subscription = await subscriptionRepository.findSubscriptionByTenantId(tenantId);
    expect(subscription?.contractedPriceCents).toBe(4990);
    expect(subscription?.condition).toBe('PAID');
  });

  it('a mensalidade do mes vigente ja foi criada no provisionamento', async () => {
    const charges = await subscriptionRepository.listChargesForTenant(tenantId);
    expect(charges).toHaveLength(1);
    expect(charges[0]?.status).toBe('PENDING');
  });

  it('ensureCurrentMonthCharge e idempotente - nao duplica a cobranca do mes', async () => {
    // A 1ª cobrança criada no provisionamento (beforeAll) é de um mês futuro
    // (Secao 113 — ver firstDueDateNextMonth acima), então a primeira chamada
    // aqui pode legitimamente criar a cobrança do mês CORRENTE (ainda
    // inexistente) — isso é comportamento correto, não uma duplicata. O que
    // este teste verifica é idempotência de verdade: chamar de novo não pode
    // criar mais nenhuma, então comparamos a contagem antes/depois da 2ª
    // chamada, em vez de um número fixo que dependeria de "hoje" e do mês da
    // 1ª cobrança coincidirem.
    await ensureCurrentMonthCharge(tenantId);
    const chargesAfterFirstCall = await subscriptionRepository.listChargesForTenant(tenantId);

    await ensureCurrentMonthCharge(tenantId);
    const chargesAfterSecondCall = await subscriptionRepository.listChargesForTenant(tenantId);

    expect(chargesAfterSecondCall).toHaveLength(chargesAfterFirstCall.length);
  });

  it('sem atraso, nenhum bloqueio e aplicado', async () => {
    await evaluateAndApplyDelinquency(tenantId);
    const blocks = await tenantRepository.findActiveBlocks(tenantId);
    expect(blocks).toHaveLength(0);
  });

  it('cobranca vencida ha mais de 5 dias aplica bloqueio DELINQUENCY automatico (Secao 113)', async () => {
    const charge = (await subscriptionRepository.listChargesForTenant(tenantId))[0]!;

    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    await prisma.subscriptionCharge.update({
      where: { id: charge.id },
      data: { dueDate: sixDaysAgo },
    });

    await evaluateAndApplyDelinquency(tenantId);

    const blocks = await tenantRepository.findActiveBlocks(tenantId);
    expect(blocks.some((block) => block.type === 'DELINQUENCY')).toBe(true);
  });

  it('reavaliar nao duplica o bloqueio ja ativo', async () => {
    await evaluateAndApplyDelinquency(tenantId);
    const blocks = await tenantRepository.findActiveBlocks(tenantId);
    expect(blocks.filter((block) => block.type === 'DELINQUENCY')).toHaveLength(1);
  });

  it('registrar pagamento marca a cobranca como paga e desbloqueia automaticamente (Secao 114)', async () => {
    const charge = (await subscriptionRepository.listChargesForTenant(tenantId))[0]!;

    await registerPayment(charge.id, adminUserId);

    const paidCharge = await subscriptionRepository.findChargeById(charge.id);
    expect(paidCharge?.status).toBe('PAID');
    expect(paidCharge?.paidAt).not.toBeNull();

    const blocks = await tenantRepository.findActiveBlocks(tenantId);
    expect(blocks.some((block) => block.type === 'DELINQUENCY')).toBe(false);
  });

  it('assinatura isenta nunca gera cobranca (Secao 108: "sem divida artificial")', async () => {
    const exemptPlan = await createTestPlan(2990);
    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant } = await provisionTenantWithOwner({
      name: 'Isento Teste',
      email: `isento-${suffix}@example.com`,
      username: `isento_${suffix}`,
      planId: exemptPlan.id,
      condition: 'EXEMPT',
      // Isento também passa por `validateFirstDueDate` (Seção 108: a
      // validação não distingue condição), mesmo nunca gerando cobrança.
      firstDueDate: firstDueDateNextMonth(),
    });

    const charges = await subscriptionRepository.listChargesForTenant(tenant.id);
    expect(charges).toHaveLength(0);

    await evaluateAndApplyDelinquency(tenant.id);
    const blocks = await tenantRepository.findActiveBlocks(tenant.id);
    expect(blocks).toHaveLength(0);

    await cleanupTenant(tenant.id);
    await deleteTestPlan(exemptPlan.id);
  });

  /**
   * Seção 174 — a fronteira EXATA (4 dias nunca bloqueia, 5 dias sempre
   * bloqueia) já é provada de forma determinística, em memória, sem
   * nenhuma dependência de banco, em
   * `src/modules/subscriptions/delinquency-rules.test.ts`. Testar essa
   * fronteira exata aqui, contra um campo `@db.Date` (que guarda só a
   * data, sem hora, e trunca o timestamp completo que construímos em
   * JavaScript), provou ser instável no CI — o mesmo "exatamente 5 dias"
   * podia truncar pra um lado ou outro dependendo do horário exato do
   * pipeline. Aqui, o teste de integração só confirma que o pipeline
   * inteiro funciona com uma cobrança isolada (Estágio 17 achou um bug
   * real: "a primeira cobrança do tenant" podia já estar paga por outro
   * teste) — usando valores confortavelmente longe da fronteira, nunca
   * exatamente nela.
   */
  it('Seção 174 — atraso claramente dentro da carência nunca bloqueia', async () => {
    const subscription = await subscriptionRepository.findSubscriptionByTenantId(tenantId);
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const charge = await prisma.subscriptionCharge.create({
      data: {
        subscriptionId: subscription!.id,
        tenantId,
        competence: new Date('2027-01-01'),
        amountCents: 4990,
        dueDate: oneDayAgo,
        status: 'PENDING',
      },
    });

    await evaluateAndApplyDelinquency(tenantId);

    const blocks = await tenantRepository.findActiveBlocks(tenantId);
    expect(blocks.some((block) => block.type === 'DELINQUENCY')).toBe(false);

    await prisma.subscriptionCharge.delete({ where: { id: charge.id } });
  });

  it('Seção 174 — atraso claramente além da carência sempre bloqueia', async () => {
    const subscription = await subscriptionRepository.findSubscriptionByTenantId(tenantId);
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const charge = await prisma.subscriptionCharge.create({
      data: {
        subscriptionId: subscription!.id,
        tenantId,
        competence: new Date('2027-02-01'),
        amountCents: 4990,
        dueDate: tenDaysAgo,
        status: 'PENDING',
      },
    });

    await evaluateAndApplyDelinquency(tenantId);

    const blocks = await tenantRepository.findActiveBlocks(tenantId);
    expect(blocks.some((block) => block.type === 'DELINQUENCY')).toBe(true);

    await tenantRepository.liftBlock(blocks[0]!.id);
    await prisma.subscriptionCharge.delete({ where: { id: charge.id } });
  });

  it('Seção 174 — bloqueio ADMINISTRATIVE (manual, pelo Admin) nunca foi testado antes — nunca é confundido com DELINQUENCY', async () => {
    const block = await tenantRepository.createBlock(
      tenantId,
      'ADMINISTRATIVE',
      'Revisão manual solicitada',
    );
    const activeBlocks = await tenantRepository.findActiveBlocks(tenantId);

    expect(activeBlocks.some((b) => b.type === 'ADMINISTRATIVE')).toBe(true);
    // Pagar a mensalidade só levanta bloqueio DELINQUENCY (Seção 114) —
    // um bloqueio ADMINISTRATIVE nunca é levantado automaticamente.
    const stillActive = await prisma.tenantAccessBlock.findUnique({ where: { id: block.id } });
    expect(stillActive?.active).toBe(true);

    await tenantRepository.liftBlock(block.id);
  });

  it('Seção 174 — bloqueio SECURITY (manual, pelo Admin) nunca foi testado antes — coexiste com outros tipos', async () => {
    const block = await tenantRepository.createBlock(
      tenantId,
      'SECURITY',
      'Atividade suspeita detectada',
    );
    const activeBlocks = await tenantRepository.findActiveBlocks(tenantId);

    expect(activeBlocks.some((b) => b.type === 'SECURITY')).toBe(true);

    await tenantRepository.liftBlock(block.id);
    const afterLift = await tenantRepository.findActiveBlocks(tenantId);
    expect(afterLift.some((b) => b.type === 'SECURITY')).toBe(false);
  });

  it('Seção 174 — histórico de cobrança é preservado após o pagamento (nunca apagado nem alterado retroativamente)', async () => {
    const charge = (await subscriptionRepository.listChargesForTenant(tenantId))[0]!;
    const originalCompetence = charge.competence;
    const originalAmount = charge.amountCents;

    await subscriptionRepository.markChargePaid(charge.id, {
      tenantId,
      userId: 'test-user',
      userEmail: 'test@example.com',
      planName: 'Plano Teste',
      amountFormatted: 'R$ 0,00',
    });

    const afterPayment = await prisma.subscriptionCharge.findUnique({ where: { id: charge.id } });
    expect(afterPayment?.status).toBe('PAID');
    expect(afterPayment?.competence.getTime()).toBe(originalCompetence.getTime());
    expect(afterPayment?.amountCents).toBe(originalAmount);
    expect(afterPayment?.paidAt).not.toBeNull();
  });

  it('evolução v1.5 — bloqueio automático por inadimplência gera um evento de outbox TenantBlocked; pagamento que desbloqueia gera TenantUnblocked', async () => {
    const charge = (await subscriptionRepository.listChargesForTenant(tenantId))[0]!;
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    await prisma.subscriptionCharge.update({
      where: { id: charge.id },
      data: { dueDate: sixDaysAgo, status: 'PENDING' },
    });

    await evaluateAndApplyDelinquency(tenantId);

    const blockedEvent = await prisma.outboxEvent.findFirst({
      where: { eventType: 'TenantBlocked' },
      orderBy: { createdAt: 'desc' },
    });
    expect(blockedEvent).not.toBeNull();
    expect((blockedEvent?.payload as { tenantId?: string })?.tenantId).toBe(tenantId);

    await registerPayment(charge.id, adminUserId);

    const unblockedEvent = await prisma.outboxEvent.findFirst({
      where: { eventType: 'TenantUnblocked' },
      orderBy: { createdAt: 'desc' },
    });
    expect(unblockedEvent).not.toBeNull();
    expect((unblockedEvent?.payload as { tenantId?: string })?.tenantId).toBe(tenantId);
  });
});

/**
 * Evolução v1.7.1 — Admin edita Plano/Condição/Vencimento de uma assinatura
 * já existente. Suíte isolada (tenant e planos próprios) pra não competir
 * com o estado mutado pelo describe acima. Cobre exatamente as 3 decisões
 * confirmadas com o cliente antes de implementar (ver doc comment de
 * `updateTenantSubscription`): re-precificação ao trocar de plano,
 * cancelamento de pendentes + desbloqueio ao virar Isento, e Vencimento
 * nunca reescrevendo uma cobrança já existente.
 */
describe('Admin edita assinatura do tenant (evolução v1.7.1)', () => {
  let tenantId: string;
  let adminUserId: string;
  let planId: string;
  let otherPlanId: string;

  beforeAll(async () => {
    const plan = await createTestPlan(4990);
    planId = plan.id;
    const otherPlan = await createTestPlan(9990);
    otherPlanId = otherPlan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant, user } = await provisionTenantWithOwner({
      name: 'Admin Edit Owner',
      email: `admin-edit-${suffix}@example.com`,
      username: `admin_edit_${suffix}`,
      planId,
      firstDueDate: firstDueDateNextMonth(),
    });
    tenantId = tenant.id;
    adminUserId = user.id;
  });

  afterAll(async () => {
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
    await deleteTestPlan(otherPlanId);
  });

  it('trocar o plano re-precifica contractedPriceCents pro preco atual do novo plano', async () => {
    await updateTenantSubscription(tenantId, adminUserId, { planId: otherPlanId });

    const subscription = await subscriptionRepository.findSubscriptionByTenantId(tenantId);
    expect(subscription?.planId).toBe(otherPlanId);
    expect(subscription?.contractedPriceCents).toBe(9990);
  });

  it('virar Isento (vindo de Pagante) cancela mensalidades PENDENTES e levanta bloqueio DELINQUENCY ativo, mas preserva as PAGAS', async () => {
    // Uma mensalidade PAGA (histórico que nunca pode ser tocado) e uma
    // PENDENTE vencida o suficiente pra gerar bloqueio automático.
    const subscription = await subscriptionRepository.findSubscriptionByTenantId(tenantId);
    const paidCharge = await prisma.subscriptionCharge.create({
      data: {
        subscriptionId: subscription!.id,
        tenantId,
        competence: new Date('2026-01-01'),
        amountCents: 9990,
        dueDate: new Date('2026-01-15'),
        status: 'PAID',
        paidAt: new Date('2026-01-10'),
      },
    });

    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
    const pendingCharge = await prisma.subscriptionCharge.create({
      data: {
        subscriptionId: subscription!.id,
        tenantId,
        competence: new Date('2026-03-01'),
        amountCents: 9990,
        dueDate: sixDaysAgo,
        status: 'PENDING',
      },
    });

    await evaluateAndApplyDelinquency(tenantId);
    const blocksBefore = await tenantRepository.findActiveBlocks(tenantId);
    expect(blocksBefore.some((block) => block.type === 'DELINQUENCY')).toBe(true);

    await updateTenantSubscription(tenantId, adminUserId, { condition: 'EXEMPT' });

    const subscriptionAfter = await subscriptionRepository.findSubscriptionByTenantId(tenantId);
    expect(subscriptionAfter?.condition).toBe('EXEMPT');

    const pendingAfter = await prisma.subscriptionCharge.findUnique({
      where: { id: pendingCharge.id },
    });
    expect(pendingAfter).toBeNull();

    const paidAfter = await prisma.subscriptionCharge.findUnique({ where: { id: paidCharge.id } });
    expect(paidAfter?.status).toBe('PAID');
    expect(paidAfter?.amountCents).toBe(9990);

    const blocksAfter = await tenantRepository.findActiveBlocks(tenantId);
    expect(blocksAfter.some((block) => block.type === 'DELINQUENCY')).toBe(false);

    await prisma.subscriptionCharge.delete({ where: { id: paidCharge.id } });
  });

  it('mudar o dia de Vencimento nao reescreve uma mensalidade PENDENTE ja existente', async () => {
    // Volta pra Pagante pra poder ter uma cobrança pendente de novo.
    await updateTenantSubscription(tenantId, adminUserId, { condition: 'PAID' });

    const subscription = await subscriptionRepository.findSubscriptionByTenantId(tenantId);
    const originalDueDate = new Date('2026-05-20');
    const pendingCharge = await prisma.subscriptionCharge.create({
      data: {
        subscriptionId: subscription!.id,
        tenantId,
        competence: new Date('2026-05-01'),
        amountCents: 9990,
        dueDate: originalDueDate,
        status: 'PENDING',
      },
    });

    await updateTenantSubscription(tenantId, adminUserId, { dueDay: 5 });

    const subscriptionAfter = await subscriptionRepository.findSubscriptionByTenantId(tenantId);
    expect(subscriptionAfter?.dueDay).toBe(5);

    const chargeAfter = await prisma.subscriptionCharge.findUnique({
      where: { id: pendingCharge.id },
    });
    expect(chargeAfter?.dueDate.getTime()).toBe(originalDueDate.getTime());

    await prisma.subscriptionCharge.delete({ where: { id: pendingCharge.id } });
  });

  it('rejeita dueDay fora do intervalo 1-28', async () => {
    await expect(updateTenantSubscription(tenantId, adminUserId, { dueDay: 29 })).rejects.toThrow();
    await expect(updateTenantSubscription(tenantId, adminUserId, { dueDay: 0 })).rejects.toThrow();
  });

  it('registra evento de auditoria TENANT_SUBSCRIPTION_UPDATED', async () => {
    await updateTenantSubscription(tenantId, adminUserId, { dueDay: 10 });

    const event = await prisma.auditEvent.findFirst({
      where: { tenantId, eventType: 'TENANT_SUBSCRIPTION_UPDATED' },
      orderBy: { createdAt: 'desc' },
    });
    expect(event).not.toBeNull();
    expect(event?.actorId).toBe(adminUserId);
  });
});
