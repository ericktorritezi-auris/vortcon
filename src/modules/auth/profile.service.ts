import { prisma } from '@/shared/database/client';
import { hashPassword, verifyPassword } from '@/shared/security/password';
import { passwordSchema } from '@/shared/security/password-policy';

interface UpdateProfileInput {
  name?: string;
  phone?: string | null;
  birthDate?: Date | null;
}

/**
 * Atualização de perfil (pedido do cliente) — nunca aceita email nem
 * username aqui, de propósito: email é o que vincula todo o processo de
 * autenticação/recuperação, username é o identificador de login. Ambos
 * ficam fora desta função — quem chama nunca deveria nem tentar passá-los.
 */
export async function updateProfile(userId: string, input: UpdateProfileInput) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      phone: input.phone,
      birthDate: input.birthDate,
    },
  });
}

interface ChangePasswordResult {
  success: boolean;
  error?: string;
}

/** Troca de senha (pedido do cliente) — exige a senha atual, nunca troca só com a nova. */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<ChangePasswordResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.passwordHash) {
    return { success: false, error: 'Usuário não encontrado.' };
  }

  const isCurrentValid = await verifyPassword(user.passwordHash, currentPassword);
  if (!isCurrentValid) {
    return { success: false, error: 'Senha atual incorreta.' };
  }

  const validation = passwordSchema.safeParse(newPassword);
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? 'Senha inválida.' };
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return { success: true };
}
