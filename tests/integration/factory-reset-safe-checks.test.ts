import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { executeFactoryReset } from '@/modules/admin/factory-reset.service';

const ORIGINAL_TOKEN = process.env.FACTORY_RESET_TOKEN;

/**
 * Estágio 19 — validação SEGURA para CI.
 *
 * Este arquivo deliberadamente NÃO executa um reset de verdade: os testes
 * de integração rodam em paralelo contra o MESMO PostgreSQL compartilhado
 * em CI (ver .github/workflows/ci.yml + vitest.config.ts, sem
 * `fileParallelism: false`) — um wipe real aqui apagaria os dados que
 * `auth-flow`, `commercial-flow`, `financial-engine-mandatory`,
 * `legal-flow`, `recurrence-flow` e `tenant-isolation` estão criando ao
 * mesmo tempo, derrubando a suíte inteira de forma incoerente.
 *
 * O comportamento destrutivo real (apaga tenants/usuários/dados
 * financeiros/auditoria, preserva plano comercial e conteúdo legal, nunca
 * roda duas vezes) foi validado manualmente e de forma rigorosa contra um
 * PostgreSQL 16 local isolado durante o desenvolvimento deste estágio —
 * populando um cenário completo e conferindo exatamente o que sobrevive e
 * o que é apagado, linha a linha. Testar a via destrutiva de novo aqui
 * exigiria um banco dedicado só para este arquivo, fora do escopo desta
 * entrega.
 *
 * O que ESTE arquivo garante em CI: as duas validações que travam a
 * execução ANTES de tocar em qualquer dado (token errado, confirmação
 * errada) — essas são seguras porque `executeFactoryReset` retorna cedo,
 * sem chamar a transação de limpeza.
 */
describe('factory reset (Estágio 19) — validações que não tocam dados', () => {
  const testToken = 'teste-token-factory-reset-32-chars';

  beforeAll(() => {
    process.env.FACTORY_RESET_TOKEN = testToken;
  });

  afterAll(() => {
    process.env.FACTORY_RESET_TOKEN = ORIGINAL_TOKEN;
  });

  it('rejeita token errado sem tocar em nenhum dado', async () => {
    const result = await executeFactoryReset('token-completamente-errado', 'RESETAR');
    expect(result.kind).toBe('INVALID_TOKEN');
  });

  it('rejeita confirmação errada sem tocar em nenhum dado', async () => {
    const result = await executeFactoryReset(testToken, 'frase-de-confirmacao-errada');
    expect(result.kind).toBe('INVALID_CONFIRMATION');
  });

  it('reporta NOT_CONFIGURED quando a variável de ambiente não está definida', async () => {
    delete process.env.FACTORY_RESET_TOKEN;
    const result = await executeFactoryReset('qualquer-coisa', 'RESETAR');
    expect(result.kind).toBe('NOT_CONFIGURED');
    process.env.FACTORY_RESET_TOKEN = testToken;
  });
});
