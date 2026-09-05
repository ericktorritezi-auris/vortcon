import { hash, verify } from '@node-rs/argon2';

/**
 * Hashing de senha (Seção 26). Argon2id, nunca reversível, nunca plaintext.
 * Parâmetros seguem a recomendação da OWASP para Argon2id (m=19MiB, t=2,
 * p=1) — equilíbrio entre custo computacional e experiência de login.
 *
 * Admin NUNCA tem acesso a este hash fora do fluxo de autenticação — ver
 * `PUBLIC_USER_SELECT` em `user.repository.ts`, que nunca seleciona
 * `passwordHash` para leituras administrativas.
 */
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, ARGON2_OPTIONS);
}

export async function verifyPassword(
  hashedPassword: string,
  plainPassword: string,
): Promise<boolean> {
  try {
    return await verify(hashedPassword, plainPassword);
  } catch {
    // Hash malformado/corrompido nunca deve derrubar o login — trata como senha incorreta.
    return false;
  }
}
