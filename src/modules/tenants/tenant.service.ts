import type { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { createAndSendInvitation } from '@/modules/auth/invitation.service';
import { ensureCurrentMonthCharge } from '@/modules/subscriptions/subscription.service';
import * as subscriptionRepository from '@/modules/subscriptions/subscription.repository';
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
  dueDay?: number;
}

/**
 * Provisiona tenant + owner + assinatura atomicamente (Seção 24, 106).
 * O preço é congelado do plano no momento da criação (Seção 107) — mudanças
 * futuras no catálogo de planos nunca afetam este contrato retroativamente.
 *
 * Não usa senha temporária (Seção 25) — `passwordHash` fica nulo até o
 * usuário definir a própria senha via convite.
 */
export async function provisionTenantWithOwner(input: ProvisionTenantInput) {
  const plan = await planRepository.findPlanById(input.planId);
  if (!plan) {
    throw new Error(`Plano ${input.planId} não encontrado.`);
  }

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

    await subscriptionRepository.createSubscription(
      {
        tenantId: createdTenant.id,
        planId: plan.id,
        contractedPriceCents: plan.priceCents,
        condition: input.condition ?? 'PAID',
        dueDay: input.dueDay ?? 10,
      },
      tx,
    );

    return { tenant: createdTenant, user: createdUser };
  });

  // Fora da transação de propósito: falha no envio do e-mail não deve
  // desfazer a criação do tenant — o Admin pode reenviar o convite
  // (Seção 25: "Reenvio possível") sem precisar recriar nada.
  await createAndSendInvitation(user.id, user.email, user.name, user.username);
  await ensureCurrentMonthCharge(tenant.id);
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
