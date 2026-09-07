import { afterEach, describe, expect, it } from 'vitest';
import { getRelyingPartyConfig } from './rp-config';

describe('getRelyingPartyConfig — a peça crítica contra "Não autorizado"', () => {
  const originalAppUrl = process.env.APP_URL;

  afterEach(() => {
    process.env.APP_URL = originalAppUrl;
  });

  it('deriva rpID e expectedOrigin da MESMA variável (APP_URL) — nunca duas fontes divergentes', () => {
    process.env.APP_URL = 'https://vortcon.belleplanner.com.br';

    const config = getRelyingPartyConfig();
    expect(config.rpID).toBe('vortcon.belleplanner.com.br');
    expect(config.expectedOrigin).toBe('https://vortcon.belleplanner.com.br');
  });

  it('rpID nunca inclui protocolo (erro clássico de configuração manual)', () => {
    process.env.APP_URL = 'https://vortcon.belleplanner.com.br';

    const config = getRelyingPartyConfig();
    expect(config.rpID).not.toContain('https://');
    expect(config.rpID).not.toContain(':');
  });

  it('rpID nunca inclui porta, mesmo se APP_URL tiver porta (ex.: ambiente local)', () => {
    process.env.APP_URL = 'http://localhost:3000';

    const config = getRelyingPartyConfig();
    expect(config.rpID).toBe('localhost');
    expect(config.expectedOrigin).toBe('http://localhost:3000');
  });

  it('lança erro explícito se APP_URL não estiver configurado — nunca finge um valor padrão silencioso', () => {
    delete process.env.APP_URL;
    expect(() => getRelyingPartyConfig()).toThrow('APP_URL não configurado');
  });

  it('lança erro se APP_URL for uma string inválida — nunca produz um rpID sem sentido', () => {
    process.env.APP_URL = 'não-é-uma-url';
    expect(() => getRelyingPartyConfig()).toThrow();
  });
});
