/**
 * Entry point do Worker (processo separado do Web Service — Seção 33, 164).
 *
 * Estágio 1: apenas o esqueleto do processo, validando a conexão com o banco.
 * Os jobs reais (outbox de notificações, recorrências, backups) entram no
 * Estágio 13, todos idempotentes (Seção 128).
 */
import { prisma } from '@/shared/database/client';

async function main(): Promise<void> {
  await prisma.$queryRaw`SELECT 1`;
  console.warn('[worker] conectado ao banco. Nenhum job registrado ainda (Estágio 1).');
}

main().catch((error: unknown) => {
  console.error('[worker] falha na inicialização:', error);
  process.exitCode = 1;
});
