import type { Role } from '@prisma/client';

/**
 * Contexto de identidade resolvido pelo AccessPolicyService (Seção 29,
 * Estágio 4 — Auth). Este tipo já existe no Estágio 3 para que a camada de
 * repositório seja escrita corretamente desde o início: toda função que lê
 * ou grava dado privado de tenant recebe `TenantContext`, nunca um
 * `tenantId` solto vindo direto do corpo da requisição (Seção 20).
 *
 * `role` é o papel do usuário autenticado (`User.role`), não algo por
 * membership — ver comentário em `schema.prisma`.
 */
export interface TenantContext {
  tenantId: string;
  userId: string;
  role: Role;
}

export class OwnershipError extends Error {
  constructor(entity: string) {
    super(`Registro de "${entity}" não pertence ao tenant autenticado.`);
    this.name = 'OwnershipError';
  }
}

/**
 * Verificação de ownership (Seção 210): ao receber um id de entidade
 * pertencente a um tenant (category_id, account_id, transaction_id etc — a
 * partir do Estágio 7), confirme que o registro carregado pertence ao
 * `tenantId` do contexto autenticado antes de qualquer leitura/escrita.
 *
 * Uso típico num repositório:
 *   const record = await prisma.someEntity.findUnique({ where: { id } });
 *   assertOwnedByTenant(record, context.tenantId, 'someEntity');
 */
export function assertOwnedByTenant<T extends { tenantId: string } | null>(
  record: T,
  tenantId: string,
  entity: string,
): asserts record is NonNullable<T> {
  if (!record || record.tenantId !== tenantId) {
    throw new OwnershipError(entity);
  }
}
