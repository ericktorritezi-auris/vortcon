import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '@/shared/security/password';

describe('hashing de senha (Seção 26)', () => {
  it('nunca armazena a senha em texto puro', async () => {
    const hashed = await hashPassword('minha-senha-super-secreta');
    expect(hashed).not.toContain('minha-senha-super-secreta');
    expect(hashed.startsWith('$argon2id$')).toBe(true);
  });

  it('verifica corretamente a senha certa', async () => {
    const hashed = await hashPassword('senha-correta-123');
    await expect(verifyPassword(hashed, 'senha-correta-123')).resolves.toBe(true);
  });

  it('rejeita a senha errada', async () => {
    const hashed = await hashPassword('senha-correta-123');
    await expect(verifyPassword(hashed, 'senha-errada-456')).resolves.toBe(false);
  });

  it('nunca lança exceção para hash malformado — trata como senha incorreta', async () => {
    await expect(verifyPassword('não-é-um-hash-argon2', 'qualquer-senha')).resolves.toBe(false);
  });

  it('duas chamadas para a mesma senha produzem hashes diferentes (salt aleatório)', async () => {
    const first = await hashPassword('mesma-senha');
    const second = await hashPassword('mesma-senha');
    expect(first).not.toBe(second);
  });
});
