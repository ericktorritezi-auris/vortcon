import { describe, expect, it } from 'vitest';
import { checkRateLimit } from '@/shared/security/rate-limit';

describe('rate limit (Seção 153)', () => {
  it('permite requisições dentro do limite', () => {
    const key = `test-${crypto.randomUUID()}`;
    for (let i = 0; i < 5; i += 1) {
      expect(checkRateLimit(key, 5, 60).allowed).toBe(true);
    }
  });

  it('bloqueia a partir do limite excedido', () => {
    const key = `test-${crypto.randomUUID()}`;
    for (let i = 0; i < 5; i += 1) {
      checkRateLimit(key, 5, 60);
    }
    const result = checkRateLimit(key, 5, 60);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('chaves diferentes têm limites independentes', () => {
    const keyA = `test-a-${crypto.randomUUID()}`;
    const keyB = `test-b-${crypto.randomUUID()}`;

    for (let i = 0; i < 5; i += 1) {
      checkRateLimit(keyA, 5, 60);
    }

    expect(checkRateLimit(keyA, 5, 60).allowed).toBe(false);
    expect(checkRateLimit(keyB, 5, 60).allowed).toBe(true);
  });

  it('libera novamente após a janela expirar', async () => {
    const key = `test-${crypto.randomUUID()}`;
    const shortWindowSeconds = 0.05; // 50ms

    checkRateLimit(key, 1, shortWindowSeconds);
    expect(checkRateLimit(key, 1, shortWindowSeconds).allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(checkRateLimit(key, 1, shortWindowSeconds).allowed).toBe(true);
  });
});
