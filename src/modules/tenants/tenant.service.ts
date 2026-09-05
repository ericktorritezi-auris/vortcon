import type { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { createAndSendInvitation } from '@/modules/auth/invitation.service';
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
}

/**
 * Provisiona tenant + owner atomicamente (Seção 24). Chamado pelo painel
 * Admin (Estágio 6) — este serviço ainda não lida com plano/condição
 * comercial/vencimento porque `subscriptions`/`plans` não existem até o
 * Estágio 6; quando existirem, a criação da assinatura inicial entra nesta
 * mesma transação, não como uma segunda escrita separada.
 *
 * Não usa senha temporária (Seção 25) — `passwordHash` fica nulo até o
 * usuário definir a própria senha via convite (Estágio 4).
 */
export async function provisionTenantWithOwner(input: ProvisionTenantInput) {
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

    return { tenant: createdTenant, user: createdUser };
  });

  // Fora da transação de propósito: falha no envio do e-mail não deve
  // desfazer a criação do tenant — o Admin pode reenviar o convite
  // (Seção 25: "Reenvio possível") sem precisar recriar nada.
  await createAndSendInvitation(user.id, user.email, user.name);

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
