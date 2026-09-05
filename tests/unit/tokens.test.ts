import { describe, expect, it } from 'vitest';
import { generateSecureToken, hashToken } from '@/shared/security/tokens';

describe('tokens seguros de uso único (Seções 25, 27, 28)', () => {
  it('gera tokens com entropia suficiente e sem colisão em 1000 gerações', () => {
    const tokens = new Set(Array.from({ length: 1000 }, () => generateSecureToken()));
    expect(tokens.size).toBe(1000);
  });

  it('o hash do token é determinístico (mesma entrada, mesma saída)', () => {
    const token = generateSecureToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('tokens diferentes produzem hashes diferentes', () => {
    const a = generateSecureToken();
    const b = generateSecureToken();
    expect(hashToken(a)).not.toBe(hashToken(b));
  });

  it('o hash nunca contém o token original (não é reversível por inspeção)', () => {
    const token = generateSecureToken();
    expect(hashToken(token)).not.toContain(token);
  });
});
