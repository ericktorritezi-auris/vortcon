import type { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { sendInviteEmail } from '@/shared/email/resend';
import { hashPassword } from '@/shared/security/password';
import { generateSecureToken, hashToken } from '@/shared/security/tokens';

const INVITE_DURATION_MS = 48 * 60 * 60 * 1000; // 48 horas (Seção 25: uso único, expiração)

/**
 * Fluxo de ativação (Seção 25): Admin cria tenant/user → convite gerado →
 * Resend envia boas-vindas → usuário abre o link → define a própria senha.
 * Admin nunca conhece a senha permanente — não existe "senha temporária".
 */
export async function createAndSendInvitation(userId: string, userEmail: string, userName: string) {
  const rawToken = generateSecureToken();

  await prisma.userInvitation.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + INVITE_DURATION_MS),
    },
  });

  const inviteUrl = `${process.env.APP_URL}/convite/${rawToken}`;
  await sendInviteEmail(userEmail, userName, inviteUrl);
}

/** Reenvio de convite (Seção 25) — invalida o anterior e gera um novo. */
export async function resendInvitation(userId: string, userEmail: string, userName: string) {
  await prisma.userInvitation.updateMany({
    where: { userId, usedAt: null },
    data: { expiresAt: new Date() }, // expira imediatamente os convites pendentes anteriores
  });

  return createAndSendInvitation(userId, userEmail, userName);
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
