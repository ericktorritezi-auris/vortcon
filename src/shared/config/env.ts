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
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('[env] Variáveis de ambiente inválidas ou ausentes:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Configuração de ambiente inválida — ver detalhes acima.');
  }

  return parsed.data;
}

export const env = loadEnv();
