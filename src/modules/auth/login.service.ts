import { prisma } from '@/shared/database/client';
import { verifyPassword } from '@/shared/security/password';
import { createSessionAndSetCookie } from './session.service';

export type LoginResult =
  | { kind: 'SUCCESS'; userId: string }
  | { kind: 'INVALID_CREDENTIALS' }
  | { kind: 'ACCOUNT_NOT_ACTIVATED' };

/**
 * Autenticação (Seção 18): usuário + senha. Mensagem de erro é sempre
 * genérica (não revela se o usuário existe ou se foi a senha) — mesma
 * lógica anti-enumeração da recuperação de senha (Seção 27).
 */
export async function login(username: string, password: string): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { username } });

  if (!user) {
    return { kind: 'INVALID_CREDENTIALS' };
  }

  if (!user.passwordHash) {
    // Convite ainda não aceito — usuário nunca definiu senha (Seção 25).
    return { kind: 'ACCOUNT_NOT_ACTIVATED' };
  }

  const isValid = await verifyPassword(user.passwordHash, password);
  if (!isValid) {
    return { kind: 'INVALID_CREDENTIALS' };
  }

  await createSessionAndSetCookie(user.id);
  return { kind: 'SUCCESS', userId: user.id };
}
