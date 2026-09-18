import type { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { createAndSendInvitation } from '@/modules/auth/invitation.service';
import * as subscriptionRepository from '@/modules/subscriptions/subscription.repository';
import {
  defaultFirstDueDate,
  dueDateForCompetence,
  dueDayFromDate,
  firstDayOfMonth,
  validateFirstDueDate,
} from '@/modules/subscriptions/billing-dates';
import * as planRepository from '@/modules/plans/plan.service';
import { recordAuditEvent } from '@/modules/audit/audit.service';
import * as tenantRepository from './tenant.repository';

export type TenantStatus =
  | { kind: 'ACTIVE' }
  | { kind: 'INACTIVE' }
  | { kind: 'BLOCKED'; blockTypes: Array<'DELINQUENCY' | 'ADMINISTRATIVE' | 'SECURITY'> };

interface ProvisionTenantInput {
  name: string;
  email: string;
  username: string;
  phone?: string;
  birthDate?: Date;
  timezone?: string;
  planId: string;
  condition?: 'PAID' | 'EXEMPT';
  /**
   * Data exata da primeira cobrança, escolhida pelo Admin (Seção 113,
   * evolução v1.6.1 — nunca mais derivada automaticamente de "hoje" +
   * um dia-do-mês abstrato; ver `billing-dates.ts`). Usada literalmente,
   * sem nenhum ajuste, na primeira `SubscriptionCharge`. Os meses
   * seguintes reaproveitam só o dia do mês dela (`dueDay`, 1-28).
   *
   * Opcional só para chamadas internas/programáticas (ex.: os testes de
   * integração de outros módulos, que só precisam de "um tenant qualquer"
   * pra testar outra coisa) — nesse caso, `defaultFirstDueDate` calcula uma
   * data hoje-ou-próxima-válida. O endpoint real do Admin
   * (`/api/admin/tenants`) exige o campo, sem default nenhum — é lá que a
   * causa raiz do bug antigo é eliminada, forçando a escolha humana.
   */
  firstDueDate?: Date;
}

/**
 * Provisiona tenant + owner + assinatura (+ primeira mensalidade, quando
 * pago) atomicamente (Seção 24, 106, 113). O preço é congelado do plano no
 * momento da criação (Seção 107) — mudanças futuras no catálogo de planos
 * nunca afetam este contrato retroativamente.
 *
 * Não usa senha temporária (Seção 25) — `passwordHash` fica nulo até o
 * usuário definir a própria senha via convite.
 */
export async function provisionTenantWithOwner(input: ProvisionTenantInput) {
  const plan = await planRepository.findPlanById(input.planId);
  if (!plan) {
    throw new Error(`Plano ${input.planId} não encontrado.`);
  }

  const today = new Date();
  const firstDueDate = input.firstDueDate ?? defaultFirstDueDate(today);

  const validation = validateFirstDueDate(firstDueDate, today);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const condition = input.condition ?? 'PAID';
  const dueDay = dueDayFromDate(firstDueDate);

  const { tenant, user } = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const createdUser = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        username: input.username,
        phone: input.phone,
        birthDate: input.birthDate,
        timezone: input.timezone ?? 'America/Sao_Paulo',
        role: 'TENANT_OWNER',
      },
    });

    const createdTenant = await tx.tenant.create({ data: {} });

    await tx.tenantUser.create({
      data: { tenantId: createdTenant.id, userId: createdUser.id },
    });

    const subscription = await subscriptionRepository.createSubscription(
      {
        tenantId: createdTenant.id,
        planId: plan.id,
        contractedPriceCents: plan.priceCents,
        condition,
        dueDay,
      },
      tx,
    );

    // A primeira mensalidade usa a data exata escolhida pelo Admin, sem
    // nenhum recálculo (Seção 113) — nasce dentro da mesma transação do
    // tenant, nunca depois: ou os dois existem, ou nenhum existe. Isento
    // (Seção 108) nunca gera cobrança — "sem dívida artificial".
    if (condition !== 'EXEMPT') {
      await subscriptionRepository.createCharge(
        {
          subscriptionId: subscription.id,
          tenantId: createdTenant.id,
          competence: firstDayOfMonth(firstDueDate),
          amountCents: plan.priceCents,
          dueDate: dueDateForCompetence(firstDayOfMonth(firstDueDate), dueDay),
        },
        tx,
      );
    }

    return { tenant: createdTenant, user: createdUser };
  });

  // Fora da transação de propósito: falha no envio do e-mail não deve
  // desfazer a criação do tenant — o Admin pode reenviar o convite
  // (Seção 25: "Reenvio possível") sem precisar recriar nada. Envolvido em
  // try/catch: sem isso, uma falha do Resend fazia esta função inteira
  // lançar DEPOIS que tenant/user/assinatura já existiam de verdade —
  // o Admin via "erro ao criar tenant" para um tenant que já tinha sido
  // criado, tendo que descobrir isso manualmente (mesmo problema, resolvido
  // de outro jeito, do bootstrap do admin no Estágio 6).
  try {
    await createAndSendInvitation(user.id, user.email, user.name, user.username);
  } catch (error) {
    console.error(
      `[tenant] Falha ao enviar convite para o tenant ${tenant.id} (usuário ${user.id}) — tenant já foi criado normalmente, reenvie o convite pelo painel Admin:`,
      error,
    );
  }
  await recordAuditEvent({
    actorType: 'GLOBAL_ADMIN',
    tenantId: tenant.id,
    eventType: 'TENANT_PROVISIONED',
    entityType: 'Tenant',
    entityId: tenant.id,
    metadataSanitized: { planId: plan.id },
  });

  return { tenant, user };
}

/**
 * Combina lifecycle + bloqueios ativos num único status (Seção 30: "Separar
 * dimensões" na modelagem, mas o AccessPolicyService do Estágio 4 precisa de
 * uma leitura consolidada para decidir a tela apropriada). Um tenant
 * INACTIVE prevalece sobre bloqueios — não faz sentido reportar "bloqueado"
 * para um tenant já encerrado.
 */
export async function getTenantStatus(tenantId: string): Promise<TenantStatus> {
  const tenant = await tenantRepository.findTenantById(tenantId);

  if (!tenant) {
    throw new Error(`Tenant ${tenantId} não encontrado.`);
  }

  if (tenant.lifecycle === 'INACTIVE') {
    return { kind: 'INACTIVE' };
  }

  const activeBlocks = await tenantRepository.findActiveBlocks(tenantId);

  if (activeBlocks.length > 0) {
    return { kind: 'BLOCKED', blockTypes: activeBlocks.map((block) => block.type) };
  }

  return { kind: 'ACTIVE' };
}
