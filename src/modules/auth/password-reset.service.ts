import type { Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { sendPasswordResetEmail } from '@/shared/email/resend';
import { hashPassword } from '@/shared/security/password';
import { generateSecureToken, hashToken } from '@/shared/security/tokens';
import * as sessionRepository from './session.repository';

const RESET_DURATION_MS = 60 * 60 * 1000; // 1 hora (Seção 27: expiração curta)

/**
 * Solicitação de recuperação (Seção 27). Sempre resolve com sucesso — a
 * mensagem exibida ao usuário é idêntica exista ou não a conta, para não
 * permitir enumerar e-mails cadastrados. O e-mail só é enviado de fato se a
 * conta existir; a ausência de envio nunca é observável pelo chamador.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return; // resposta idêntica ao caso de sucesso — sem enumeração (Seção 27)
  }

  const rawToken = generateSecureToken();

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + RESET_DURATION_MS),
    },
  });

  const resetUrl = `${process.env.APP_URL}/redefinir-senha/${rawToken}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

export type ConsumePasswordResetResult =
  { kind: 'INVALID_OR_EXPIRED' } | { kind: 'SUCCESS'; userId: string };

/**
 * Define nova senha, invalida o token e revoga sessões antigas (Seção 27:
 * "sessões antigas tratadas conforme política" — aqui, revogação total,
 * para que uma sessão obtida antes da troca de senha não sobreviva a ela).
 */
export async function consumePasswordReset(
  rawToken: string,
  newPassword: string,
): Promise<ConsumePasswordResetResult> {
  const tokenHash = hashToken(rawToken);

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const resetToken = await tx.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return { kind: 'INVALID_OR_EXPIRED' as const };
    }

    const passwordHash = await hashPassword(newPassword);

    await tx.user.update({ where: { id: resetToken.userId }, data: { passwordHash } });
    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    return { kind: 'SUCCESS' as const, userId: resetToken.userId };
  });

  if (result.kind === 'SUCCESS') {
    await sessionRepository.revokeAllSessionsForUser(result.userId);
  }

  return result;
}
