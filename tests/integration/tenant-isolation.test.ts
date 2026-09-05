import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/database/client';
import * as tenantRepository from '@/modules/tenants/tenant.repository';
import { provisionTenantWithOwner } from '@/modules/tenants/tenant.service';
import { cleanupTenant, createTestPlan, deleteTestPlan } from '../helpers/commercial';

/**
 * Testes obrigatórios de multitenancy A/B (Seção 21, 174). Rodam contra um
 * PostgreSQL real (serviço do GitHub Actions em CI — ver .github/workflows/ci.yml).
 *
 * Cada cenário aqui foi primeiro validado manualmente via SQL puro contra um
 * PostgreSQL 16 local durante o desenvolvimento deste estágio (o binário de
 * engine do Prisma não está disponível no ambiente onde este código foi
 * escrito) — este arquivo é a versão que passa a rodar de verdade a cada
 * push, via CI, contra a stack real (Prisma + Postgres).
 */
describe('isolamento multitenant (tenant A / tenant B)', () => {
  let tenantAId: string;
  let tenantBId: string;
  let userAId: string;
  let planId: string;

  beforeAll(async () => {
    const plan = await createTestPlan();
    planId = plan.id;

    const a = await provisionTenantWithOwner({
      name: 'Tenant A',
      email: `a-${crypto.randomUUID()}@example.com`,
      username: `tenant_a_${crypto.randomUUID().slice(0, 8)}`,
      planId,
    });
    const b = await provisionTenantWithOwner({
      name: 'Tenant B',
      email: `b-${crypto.randomUUID()}@example.com`,
      username: `tenant_b_${crypto.randomUUID().slice(0, 8)}`,
      planId,
    });

    tenantAId = a.tenant.id;
    tenantBId = b.tenant.id;
    userAId = a.user.id;

    await tenantRepository.createBlock(tenantBId, 'DELINQUENCY', 'Teste A/B');
  });

  afterAll(async () => {
    await cleanupTenant(tenantAId);
    await cleanupTenant(tenantBId);
    await deleteTestPlan(planId);
  });

  it('bloqueio do tenant B nunca aparece numa checagem escopada no tenant A', async () => {
    const blocksForA = await tenantRepository.findActiveBlocks(tenantAId);
    expect(blocksForA).toHaveLength(0);

    const blocksForB = await tenantRepository.findActiveBlocks(tenantBId);
    expect(blocksForB).toHaveLength(1);
    expect(blocksForB[0]?.type).toBe('DELINQUENCY');
  });

  it('um usuário não pode pertencer a dois tenants (constraint única em userId)', async () => {
    await expect(
      prisma.tenantUser.create({ data: { tenantId: tenantBId, userId: userAId } }),
    ).rejects.toThrow();
  });

  it('tenant_user não pode referenciar um tenant inexistente (foreign key)', async () => {
    const orphanUser = await prisma.user.create({
      data: {
        name: 'Órfão',
        email: `orphan-${crypto.randomUUID()}@example.com`,
        username: `orphan_${crypto.randomUUID().slice(0, 8)}`,
      },
    });

    await expect(
      prisma.tenantUser.create({ data: { tenantId: 'tenant-inexistente', userId: orphanUser.id } }),
    ).rejects.toThrow();

    await prisma.user.delete({ where: { id: orphanUser.id } });
  });

  it('tenant não é hard deleted enquanto tiver membership ativa (Seção 31)', async () => {
    await expect(prisma.tenant.delete({ where: { id: tenantAId } })).rejects.toThrow();
  });

  it('desativar um tenant é uma transição de lifecycle, não uma exclusão', async () => {
    await tenantRepository.deactivateTenant(tenantAId);
    const status = await tenantRepository.findTenantById(tenantAId);
    expect(status?.lifecycle).toBe('INACTIVE');

    await tenantRepository.reactivateTenant(tenantAId);
    const restored = await tenantRepository.findTenantById(tenantAId);
    expect(restored?.lifecycle).toBe('ACTIVE');
  });
});
