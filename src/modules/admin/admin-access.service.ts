import { getCurrentSession } from '@/modules/auth/session.service';

export type AdminGuardResult =
  { kind: 'UNAUTHENTICATED' } | { kind: 'FORBIDDEN' } | { kind: 'ALLOWED'; userId: string };

/**
 * Guard do painel Admin (Seção 22-23) — deliberadamente mais simples que o
 * `AccessPolicyService` (Seção 29): Admin não tem tenant, lifecycle ou
 * bloqueios para checar, só identidade + papel. Nunca reutilizar
 * `evaluateAccessPolicy()` aqui — ele lança erro de propósito se chamado
 * para um `GLOBAL_ADMIN`.
 */
export async function evaluateAdminAccess(): Promise<AdminGuardResult> {
  const session = await getCurrentSession();

  if (!session) {
    return { kind: 'UNAUTHENTICATED' };
  }

  if (session.user.role !== 'GLOBAL_ADMIN') {
    return { kind: 'FORBIDDEN' };
  }

  return { kind: 'ALLOWED', userId: session.userId };
}
