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
 *
 * Aceita o valor digitado como username OU e-mail (nesta ordem) — o campo
 * continua se chamando "Usuário" na tela (Seção 18 não muda), mas username
 * e e-mail são fáceis de confundir na prática (o username é derivado
 * automaticamente e nunca é comunicado com destaque em lugar nenhum do
 * fluxo de ativação), então aceitar os dois evita um erro genérico de
 * "usuário ou senha inválidos" que na real é só o campo errado.
 */
export async function login(usernameOrEmail: string, password: string): Promise<LoginResult> {
  const user =
    (await prisma.user.findUnique({ where: { username: usernameOrEmail } })) ??
    (await prisma.user.findUnique({ where: { email: usernameOrEmail } }));

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
