import { prisma } from '@/shared/database/client';
import { hashToken } from '@/shared/security/tokens';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 dias

export async function createSessionRecord(userId: string, rawToken: string) {
  return prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
  });
}

/** Retorna a sessão só se ainda válida (não revogada, não expirada). */
export async function findValidSessionByToken(rawToken: string) {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
  });

  if (!session || session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  return session;
}

export async function revokeSessionByToken(rawToken: string): Promise<void> {
  await prisma.session.updateMany({
    where: { tokenHash: hashToken(rawToken), revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/** Revoga todas as sessões ativas do usuário (Seção 27: "sessões antigas tratadas conforme política"). */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
