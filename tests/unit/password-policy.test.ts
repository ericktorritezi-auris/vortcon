import { describe, expect, it } from 'vitest';
import { passwordSchema } from '@/shared/security/password-policy';

describe('política de senha', () => {
  it('aceita uma senha que cumpre todos os requisitos', () => {
    expect(passwordSchema.safeParse('Senha@123').success).toBe(true);
  });

  it('aceita @ livremente — não há restrição de caractere por segurança de banco', () => {
    expect(passwordSchema.safeParse('MinhaSenha@2026').success).toBe(true);
  });

  it('rejeita senha curta demais', () => {
    expect(passwordSchema.safeParse('Ab@1').success).toBe(false);
  });

  it('rejeita senha sem letra maiúscula', () => {
    expect(passwordSchema.safeParse('senha@123').success).toBe(false);
  });

  it('rejeita senha sem número', () => {
    expect(passwordSchema.safeParse('Senha@abc').success).toBe(false);
  });

  it('rejeita senha sem caractere especial', () => {
    expect(passwordSchema.safeParse('Senha1234').success).toBe(false);
  });

  it('rejeita senha maior que o limite máximo', () => {
    expect(passwordSchema.safeParse(`Senha@1${'a'.repeat(130)}`).success).toBe(false);
  });
});
