/**
 * Validação central de variáveis de ambiente (Master Document, Seção 163).
 *
 * Toda leitura de `process.env` na aplicação deve passar por este módulo — nunca
 * ler `process.env.X` diretamente em código de domínio. Isso garante que a
 * aplicação falha rápido e de forma clara na inicialização, em vez de falhar
 * silenciosamente em produção com uma variável ausente ou malformada.
 */
import { z } from 'zod';

const envSchema = z.object({
  // APP_*
  APP_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url(),

  // DATABASE_*
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatória'),

  // AUTH_*
  AUTH_SESSION_SECRET: z.string().min(32, 'AUTH_SESSION_SECRET deve ter ao menos 32 caracteres'),

  // RESEND_*
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().optional(),

  // VAPID_* (Web Push)
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),

  // Comercial — nunca hardcode nem versionar valor real (Seção 111)
  VORTCON_PIX_KEY: z.string().optional(),

  // ADMIN_BOOTSTRAP_* — criação segura do primeiro GLOBAL_ADMIN (Seção 162)
  ADMIN_BOOTSTRAP_EMAIL: z.string().email().optional(),
  ADMIN_BOOTSTRAP_TOKEN: z.string().min(16).optional(),

  // FACTORY_RESET_TOKEN — Estágio 19 (uso único, zera todo dado de teste
  // antes do início do uso real). Sem esta variável, a rota fica inativa.
  FACTORY_RESET_TOKEN: z.string().min(16).optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Next.js executa "Collecting page data" durante `next build`: ele carrega o
 * módulo de cada rota (inclusive os `import`s no topo do arquivo) só para
 * analisar sua forma — sem que as variáveis de runtime estejam necessariamente
 * configuradas ainda no serviço. `NEXT_PHASE` é definida pelo próprio Next.js
 * nesse momento; usamos isso para não travar o build por uma variável que só
 * é necessária quando a aplicação de fato começa a servir tráfego.
 *
 * A validação estrita continua acontecendo sempre no boot real do processo
 * (`next start`, `next dev`, worker, scripts) — falha rápido é preservado
 * onde importa: no runtime, não numa etapa estática de análise do build.
 */
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

function loadEnv(): Env {
  if (isBuildPhase) {
    return envSchema.parse({
      ...process.env,
      APP_URL: process.env.APP_URL ?? 'http://localhost:3000',
      AUTH_SESSION_SECRET: process.env.AUTH_SESSION_SECRET ?? 'x'.repeat(32),
      DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://build:build@localhost:5432/build',
    });
  }

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('[env] Variáveis de ambiente inválidas ou ausentes:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Configuração de ambiente inválida — ver detalhes acima.');
  }

  return parsed.data;
}

export const env = loadEnv();
