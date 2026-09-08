import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { changePassword, updateProfile } from '@/modules/auth/profile.service';
import { hashPassword, verifyPassword } from '@/shared/security/password';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Meu Perfil (pedido do cliente), validado contra PostgreSQL real em CI.
 */
describe('Perfil do usuário', () => {
  let userId: string;
  let tenantId: string;
  let planId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const suffix = crypto.randomUUID().slice(0, 8);
    const { tenant, user } = await provisionTenantWithOwner({
      name: 'Profile Test Owner',
      email: `profile-${suffix}@example.com`,
      username: `profile_${suffix}`,
      planId,
    });
    tenantId = tenant.id;
    userId = user.id;

    // Simula ativação (senha definida) — provisionTenantWithOwner não define senha.
    const passwordHash = await hashPassword('SenhaAtual@123');
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  });

  afterAll(async () => {
    await cleanupTenant(tenantId);
    await deleteTestPlan(planId);
  });

  it('atualiza nome, telefone e data de nascimento — nunca email/username', async () => {
    await updateProfile(userId, {
      name: 'Nome Atualizado',
      phone: '11999998888',
      birthDate: new Date('1990-05-15'),
    });

    const updated = await prisma.user.findUnique({ where: { id: userId } });
    expect(updated?.name).toBe('Nome Atualizado');
    expect(updated?.phone).toBe('11999998888');
    expect(updated?.birthDate?.toISOString().slice(0, 10)).toBe('1990-05-15');
  });

  it('troca de senha exige a senha atual correta', async () => {
    const result = await changePassword(userId, 'senhaErrada', 'NovaSenha@456');
    expect(result.success).toBe(false);
    expect(result.error).toContain('incorreta');
  });

  it('troca de senha rejeita nova senha fora da política', async () => {
    const result = await changePassword(userId, 'SenhaAtual@123', 'fraca');
    expect(result.success).toBe(false);
  });

  it('troca de senha funciona com a senha atual correta e nova senha válida', async () => {
    const result = await changePassword(userId, 'SenhaAtual@123', 'NovaSenhaForte@789');
    expect(result.success).toBe(true);

    const updated = await prisma.user.findUnique({ where: { id: userId } });
    const matches = await verifyPassword(updated!.passwordHash!, 'NovaSenhaForte@789');
    expect(matches).toBe(true);

    const oldStillWorks = await verifyPassword(updated!.passwordHash!, 'SenhaAtual@123');
    expect(oldStillWorks).toBe(false);
  });
});
