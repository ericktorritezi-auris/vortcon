import { createHash, randomBytes } from 'node:crypto';

/**
 * Tokens de uso único (convite, redefinição de senha, sessão — Seções 25,
 * 27, 28). O valor bruto (`token`) só existe no link enviado por e-mail ou
 * no cookie do navegador; o banco guarda apenas `tokenHash`. Comprometer o
 * banco não permite reconstruir o token original nem sequestrar contas.
 */

const RAW_TOKEN_BYTES = 32; // 256 bits de entropia

export function generateSecureToken(): string {
  return randomBytes(RAW_TOKEN_BYTES).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
