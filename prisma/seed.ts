/**
 * VortCon — seed inicial (Estágio 1)
 *
 * Regra normativa (Seção 161): não criar dados privados nem catálogo financeiro
 * obrigatório sem decisão explícita. O seed comercial (plano "VortCon Pro — R$ 49,90
 * — Mensal — Ativo", Seção 103/153) entra no Estágio 6, junto do módulo de planos.
 *
 * Automação (ver README, seção "Deploy"): a partir do Estágio 6, este arquivo passa a
 * usar `upsert` (nunca `create` puro) para ser seguro de rodar em todo deploy, e será
 * encadeado automaticamente no script `start` — sem qualquer comando manual.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.systemHealth.create({ data: {} });
  console.warn('[seed] Estágio 1: seed de fundação executado com sucesso.');
}

main()
  .catch((error: unknown) => {
    console.error('[seed] falhou:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
