import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { consumeInvitation } from '@/modules/auth/invitation.service';
import { login } from '@/modules/auth/login.service';
import { consumePasswordReset, requestPasswordReset } from '@/modules/auth/password-reset.service';
import * as sessionRepository from '@/modules/auth/session.repository';
import { generateSecureToken, hashToken } from '@/shared/security/tokens';

/**
 * Fluxo completo de Auth (Seções 18, 25, 27), validado contra PostgreSQL
 * real (serviço do GitHub Actions em CI). `RESEND_API_KEY` não é configurada
 * em CI — o envio de e-mail é pulado (ver `shared/email/resend.ts`), então
 * estes testes extraem o token diretamente do banco, como faria um usuário
 * clicando no link recebido por e-mail em produção.
 */
describe('fluxo de autenticação', () => {
  let userId: string;
  let userEmail: string;
  let userUsername: string;

  beforeAll(async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    userEmail = `owner-${suffix}@example.com`;
    userUsername = `owner_${suffix}`;

    const { user } = await provisionTenantWithOwner({
      name: 'Dono do Tenant',
      email: userEmail,
      username: userUsername,
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.userInvitation.deleteMany({ where: { userId } });
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    const tenantMembership = await prisma.tenantUser.findFirst({ where: { userId } });
    await prisma.tenantUser.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
    if (tenantMembership) {
      await prisma.tenant.deleteMany({ where: { id: tenantMembership.tenantId } });
    }
  });

  it('provisionar tenant cria usuário sem senha e com convite pendente', async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(user.passwordHash).toBeNull();

    const invitation = await prisma.userInvitation.findFirstOrThrow({ where: { userId } });
    expect(invitation.usedAt).toBeNull();
    expect(invitation.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('login falha com ACCOUNT_NOT_ACTIVATED antes do convite ser aceito', async () => {
    const result = await login(userUsername, 'qualquer-coisa');
    expect(result.kind).toBe('ACCOUNT_NOT_ACTIVATED');
  });

  it('aceitar o convite define a senha e consome o token (uso único)', async () => {
    // Simula abrir o link do e-mail: o token bruto só existiria no e-mail em
    // produção. Como o teste não tem acesso à caixa de entrada, reconstrói
    // um convite com token conhecido para exercitar o consumo de ponta a ponta.
    const rawToken = generateSecureToken();

    await prisma.userInvitation.updateMany({
      where: { userId, usedAt: null },
      data: { tokenHash: hashToken(rawToken) },
    });

    const first = await consumeInvitation(rawToken, 'senha-inicial-123');
    expect(first.kind).toBe('SUCCESS');

    const second = await consumeInvitation(rawToken, 'outra-senha-456');
    expect(second.kind).toBe('INVALID_OR_EXPIRED');
  });

  it('login funciona após a ativação, com a senha definida', async () => {
    const result = await login(userUsername, 'senha-inicial-123');
    expect(result.kind).toBe('SUCCESS');

    const wrongPassword = await login(userUsername, 'senha-errada');
    expect(wrongPassword.kind).toBe('INVALID_CREDENTIALS');
  });

  it('recuperação de senha invalida sessões antigas e permite novo login', async () => {
    const session = await sessionRepository.createSessionRecord(userId, 'token-de-teste-antigo');
    expect(session.revokedAt).toBeNull();

    await requestPasswordReset(userEmail);
    const resetToken = await prisma.passwordResetToken.findFirstOrThrow({
      where: { userId, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    const rawResetToken = generateSecureToken();
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { tokenHash: hashToken(rawResetToken) },
    });

    const result = await consumePasswordReset(rawResetToken, 'senha-nova-789');
    expect(result.kind).toBe('SUCCESS');

    const revokedSession = await prisma.session.findUnique({ where: { id: session.id } });
    expect(revokedSession?.revokedAt).not.toBeNull();

    const loginResult = await login(userUsername, 'senha-nova-789');
    expect(loginResult.kind).toBe('SUCCESS');
  });

  it('solicitar recuperação para e-mail inexistente não lança erro (anti-enumeração, Seção 27)', async () => {
    await expect(
      requestPasswordReset('nao-existe-de-verdade@example.com'),
    ).resolves.toBeUndefined();
  });
});
