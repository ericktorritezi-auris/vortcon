import { describe, expect, it } from 'vitest';
import { z } from 'zod';

/**
 * Teste de exemplo do Estágio 1 — não importa `src/shared/config/env.ts` diretamente
 * porque esse módulo lê `process.env` no import e lançaria em ambiente de teste sem
 * as variáveis reais configuradas. Em vez disso, valida a mesma forma de schema
 * isoladamente, servindo de modelo para os testes financeiros obrigatórios do
 * Estágio 7 (Seção 170), que devem seguir este padrão de isolamento.
 */
const sampleSchema = z.object({
  APP_URL: z.string().url(),
  AUTH_SESSION_SECRET: z.string().min(32),
});

describe('env schema shape', () => {
  it('aceita uma configuração válida', () => {
    const result = sampleSchema.safeParse({
      APP_URL: 'http://localhost:3000',
      AUTH_SESSION_SECRET: 'a'.repeat(32),
    });

    expect(result.success).toBe(true);
  });

  it('rejeita AUTH_SESSION_SECRET curto', () => {
    const result = sampleSchema.safeParse({
      APP_URL: 'http://localhost:3000',
      AUTH_SESSION_SECRET: 'muito-curto',
    });

    expect(result.success).toBe(false);
  });

  it('rejeita APP_URL malformada', () => {
    const result = sampleSchema.safeParse({
      APP_URL: 'nao-e-uma-url',
      AUTH_SESSION_SECRET: 'a'.repeat(32),
    });

    expect(result.success).toBe(false);
  });
});
