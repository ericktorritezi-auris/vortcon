import { prisma } from '@/shared/database/client';
import { createInvitation } from '@/modules/auth/invitation.service';
import { sendInviteEmail } from '@/shared/email/resend';

export type BootstrapResult =
  | { kind: 'INVALID_TOKEN' }
  | { kind: 'NOT_CONFIGURED' }
  | { kind: 'ALREADY_BOOTSTRAPPED' }
  | { kind: 'SUCCESS' };

/**
 * Bootstrap do primeiro GLOBAL_ADMIN (Seção 162) — via ambiente, sem senha
 * hardcoded. Reaproveita o fluxo de convite (Seção 25): o admin recebe
 * e-mail e define a própria senha, exatamente como um TENANT_OWNER — não
 * existe lógica de senha especial para admin.
 *
 * Idempotente e seguro contra reexecução: só funciona se ainda não existir
 * nenhum GLOBAL_ADMIN. Depois do primeiro uso, `ADMIN_BOOTSTRAP_TOKEN` pode
 * ser removido das variáveis de ambiente sem afetar nada.
 */
export async function bootstrapGlobalAdmin(providedToken: string): Promise<BootstrapResult> {
  const expectedToken = process.env.ADMIN_BOOTSTRAP_TOKEN;
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL;

  if (!expectedToken || !email) {
    return { kind: 'NOT_CONFIGURED' };
  }

  if (providedToken !== expectedToken) {
    return { kind: 'INVALID_TOKEN' };
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: 'GLOBAL_ADMIN' } });
  if (existingAdmin) {
    return { kind: 'ALREADY_BOOTSTRAPPED' };
  }

  const username = email.split('@')[0] ?? 'admin';

  const admin = await prisma.user.create({
    data: {
      name: 'Administrador VortCon',
      email,
      username,
      role: 'GLOBAL_ADMIN',
    },
  });

  const { inviteUrl } = await createInvitation(admin.id);

  // Sempre loga o link E o username, independente do Resend conseguir
  // entregar (Seção 162 é uma ação de configuração única, feita por quem já
  // tem acesso aos logs do Railway — não há exposição adicional relevante
  // em expor isso especificamente aqui). Crítico quando `ADMIN_BOOTSTRAP_EMAIL`
  // não é uma caixa real: sem isso, o único admin ficaria sem forma de
  // ativar a conta OU sem saber qual username usar para logar depois
  // (login é por username — Seção 18 — não por e-mail).
  console.warn(
    `[admin-bootstrap] Link de ativação do administrador: ${inviteUrl} — username de login: ${username}`,
  );

  try {
    await sendInviteEmail(admin.email, admin.name, admin.username, inviteUrl);
  } catch (error) {
    console.error(
      '[admin-bootstrap] Falha ao enviar e-mail de convite (o link e o username acima nos logs continuam válidos):',
      error,
    );
  }

  return { kind: 'SUCCESS' };
}
