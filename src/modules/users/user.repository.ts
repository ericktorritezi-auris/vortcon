import { prisma } from '@/shared/database/client';

/**
 * Camada de acesso a `users` (Seção 24, 207). `passwordHash` nunca é
 * selecionado por padrão nas funções de leitura usadas fora do módulo
 * `auth` — evita vazar o hash em respostas de API por descuido.
 */

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  phone: true,
  birthDate: true,
  username: true,
  timezone: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function findUserById(userId: string) {
  return prisma.user.findUnique({ where: { id: userId }, select: PUBLIC_USER_SELECT });
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email }, select: PUBLIC_USER_SELECT });
}

export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({ where: { username }, select: PUBLIC_USER_SELECT });
}

/** Username não é alterável pelo tenant em V1 (Seção 207) — só telefone/e-mail/timezone. */
export async function updateUserProfile(
  userId: string,
  data: { phone?: string; email?: string; timezone?: string },
) {
  return prisma.user.update({ where: { id: userId }, data, select: PUBLIC_USER_SELECT });
}
