import type { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { sendInviteEmail } from '@/shared/email/resend';
import { hashPassword } from '@/shared/security/password';
import { generateSecureToken, hashToken } from '@/shared/security/tokens';

const INVITE_DURATION_MS = 48 * 60 * 60 * 1000; // 48 horas (Seção 25: uso único, expiração)

/**
 * Cria o registro de convite e retorna o token bruto (Seção 25). Separado
 * do envio de e-mail de propósito: o bootstrap do admin (Seção 162) precisa
 * do link mesmo quando o e-mail configurado não é uma caixa real — ver
 * `admin-bootstrap.service.ts`.
 */
export async function createInvitation(
  userId: string,
): Promise<{ rawToken: string; inviteUrl: string }> {
  const rawToken = generateSecureToken();

  await prisma.userInvitation.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + INVITE_DURATION_MS),
    },
  });

  return { rawToken, inviteUrl: `${process.env.APP_URL}/convite/${rawToken}` };
}

/**
 * Fluxo de ativação (Seção 25): Admin cria tenant/user → convite gerado →
 * Resend envia boas-vindas → usuário abre o link → define a própria senha.
 * Admin nunca conhece a senha permanente — não existe "senha temporária".
 */
export async function createAndSendInvitation(
  userId: string,
  userEmail: string,
  userName: string,
  username: string,
) {
  const { inviteUrl } = await createInvitation(userId);
  await sendInviteEmail(userEmail, userName, username, inviteUrl);
}

/** Reenvio de convite (Seção 25) — invalida o anterior e gera um novo. */
export async function resendInvitation(
  userId: string,
  userEmail: string,
  userName: string,
  username: string,
) {
  await prisma.userInvitation.updateMany({
    where: { userId, usedAt: null },
    data: { expiresAt: new Date() }, // expira imediatamente os convites pendentes anteriores
  });

  return createAndSendInvitation(userId, userEmail, userName, username);
}

export type ConsumeInvitationResult =
  { kind: 'INVALID_OR_EXPIRED' } | { kind: 'SUCCESS'; userId: string };

/**
 * Define a senha e marca o convite como usado — atômico, para que uma
 * corrida entre duas abas nunca consuma o mesmo convite duas vezes.
 */
export async function consumeInvitation(
  rawToken: string,
  newPassword: string,
): Promise<ConsumeInvitationResult> {
  const tokenHash = hashToken(rawToken);

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const invitation = await tx.userInvitation.findUnique({ where: { tokenHash } });

    if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
      return { kind: 'INVALID_OR_EXPIRED' as const };
    }

    const passwordHash = await hashPassword(newPassword);

    await tx.user.update({ where: { id: invitation.userId }, data: { passwordHash } });
    await tx.userInvitation.update({ where: { id: invitation.id }, data: { usedAt: new Date() } });

    return { kind: 'SUCCESS' as const, userId: invitation.userId };
  });
}
