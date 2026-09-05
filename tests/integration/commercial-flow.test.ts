import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import * as subscriptionRepository from '@/modules/subscriptions/subscription.repository';
import {
  ensureCurrentMonthCharge,
  evaluateAndApplyDelinquency,
  registerPayment,
} from '@/modules/subscriptions/subscription.service';
import * as tenantRepository from '@/modules/tenants/tenant.repository';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

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
    await ensureCurrentMonthCharge(tenantId);
    await ensureCurrentMonthCharge(tenantId);

    const charges = await subscriptionRepository.listChargesForTenant(tenantId);
    expect(charges).toHaveLength(1);
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
    });

    const charges = await subscriptionRepository.listChargesForTenant(tenant.id);
    expect(charges).toHaveLength(0);

    await evaluateAndApplyDelinquency(tenant.id);
    const blocks = await tenantRepository.findActiveBlocks(tenant.id);
    expect(blocks).toHaveLength(0);

    await cleanupTenant(tenant.id);
    await deleteTestPlan(exemptPlan.id);
  });
});
