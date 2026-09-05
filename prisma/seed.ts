/**
 * VortCon — seed (Estágio 6)
 *
 * Idempotente (upsert por nome, nunca `create` puro) — seguro de rodar em
 * todo boot da aplicação, encadeado no script `start` (ver README, seção
 * "Deploy"). Nenhum dado privado de tenant é criado aqui (Seção 161).
 *
 * A inserção incondicional em `SystemHealth` do Estágio 1 foi removida:
 * agora que este arquivo roda a cada `next start`, uma linha por boot
 * cresceria sem limite. O healthcheck (`/api/health`) usa `SELECT 1` direto,
 * nunca leu essa tabela — a tabela continua existindo (sem motivo pra
 * migration só por isso), mas o seed não a alimenta mais.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VORTCON_PRO_PLAN = {
  name: 'VortCon Pro',
  priceCents: 4990, // R$ 49,90 (Seção 103) — nunca float (Seção 36)
} as const;

async function main(): Promise<void> {
  const existing = await prisma.subscriptionPlan.findFirst({
    where: { name: VORTCON_PRO_PLAN.name },
  });

  if (existing) {
    await prisma.subscriptionPlan.update({
      where: { id: existing.id },
      data: { priceCents: VORTCON_PRO_PLAN.priceCents, active: true },
    });
  } else {
    await prisma.subscriptionPlan.create({
      data: { ...VORTCON_PRO_PLAN, periodicity: 'MONTHLY', active: true },
    });
  }

  console.warn('[seed] VortCon Pro convergido (R$ 49,90 / mensal / ativo).');
}

main()
  .catch((error: unknown) => {
    console.error('[seed] falhou:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
