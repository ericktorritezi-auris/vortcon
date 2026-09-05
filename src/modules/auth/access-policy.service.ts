import type { Role } from '@prisma/client';
import type { TenantContext } from '@/shared/security/tenant-context';
import * as tenantRepository from '@/modules/tenants/tenant.repository';
import { hasAcceptedAllRequiredDocuments } from '@/modules/legal/legal-acceptance.service';
import {
  ensureCurrentMonthCharge,
  evaluateAndApplyDelinquency,
} from '@/modules/subscriptions/subscription.service';
import { getCurrentSession } from './session.service';

/**
 * Gate central de acesso (Seção 29). Toda rota privada da área do tenant
 * passa por aqui antes de renderizar — nunca confia em "está logado" sozinho.
 *
 * Ordem de verificação: identidade → tenant → lifecycle → bloqueios → legal
 * → autorização. Cada resultado leva a uma tela específica (definida pelo
 * middleware/páginas que consomem este serviço).
 *
 * Este serviço avalia acesso à área financeira do tenant (`TENANT_OWNER`).
 * `GLOBAL_ADMIN` não tem tenant (Seção 22) e usa seu próprio guard mais
 * simples no painel Admin (Estágio 6) — chamar este gate para um
 * `GLOBAL_ADMIN` é erro de programação, não um estado de usuário.
 */
export type AccessPolicyResult =
  | { kind: 'UNAUTHENTICATED' }
  | { kind: 'TENANT_INACTIVE' }
  | { kind: 'DELINQUENCY_BLOCKED' }
  | { kind: 'ADMIN_BLOCKED' }
  | { kind: 'SECURITY_BLOCKED' }
  | { kind: 'LEGAL_ACCEPTANCE_REQUIRED'; context: TenantContext }
  | { kind: 'ALLOWED'; context: TenantContext };

export async function evaluateAccessPolicy(): Promise<AccessPolicyResult> {
  const session = await getCurrentSession();
  if (!session) {
    return { kind: 'UNAUTHENTICATED' };
  }

  const role: Role = session.user.role;
  if (role === 'GLOBAL_ADMIN') {
    throw new Error(
      'evaluateAccessPolicy() foi chamado para um GLOBAL_ADMIN — use o guard do painel Admin (Estágio 6).',
    );
  }

  const tenant = await tenantRepository.findTenantByUserId(session.userId);
  if (!tenant) {
    // TENANT_OWNER sem tenant é estado inconsistente (nunca deveria ocorrer
    // dado provisionTenantWithOwner ser atômico) — trata como não autenticado.
    return { kind: 'UNAUTHENTICATED' };
  }

  if (tenant.lifecycle === 'INACTIVE') {
    return { kind: 'TENANT_INACTIVE' };
  }

  // Substituto reativo de job agendado (Estágio 13 ainda não existe) — ver
  // comentário em subscription.service.ts. `ensureCurrentMonthCharge` cria a
  // mensalidade do mês vigente se ainda não existir; `evaluateAndApplyDelinquency`
  // depende dela existir para decidir se há atraso. Roda antes de checar
  // bloqueios para que um bloqueio recém-aplicado já apareça abaixo.
  await ensureCurrentMonthCharge(tenant.id);
  await evaluateAndApplyDelinquency(tenant.id);

  const activeBlocks = await tenantRepository.findActiveBlocks(tenant.id);
  if (activeBlocks.some((block) => block.type === 'SECURITY')) {
    return { kind: 'SECURITY_BLOCKED' };
  }
  if (activeBlocks.some((block) => block.type === 'ADMINISTRATIVE')) {
    return { kind: 'ADMIN_BLOCKED' };
  }
  if (activeBlocks.some((block) => block.type === 'DELINQUENCY')) {
    return { kind: 'DELINQUENCY_BLOCKED' };
  }

  const context: TenantContext = { tenantId: tenant.id, userId: session.userId, role };

  const legalAccepted = await hasAcceptedAllRequiredDocuments(session.userId);
  if (!legalAccepted) {
    return { kind: 'LEGAL_ACCEPTANCE_REQUIRED', context };
  }

  return { kind: 'ALLOWED', context };
}
