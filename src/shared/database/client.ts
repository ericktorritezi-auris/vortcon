import { PrismaClient } from '@prisma/client';
import { env } from '@/shared/config/env';

/**
 * Singleton do Prisma Client. Em desenvolvimento, o Next.js recarrega módulos a
 * cada mudança de arquivo — sem esse padrão, cada reload abriria uma nova conexão
 * com o PostgreSQL até esgotar o pool.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.APP_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (env.APP_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
