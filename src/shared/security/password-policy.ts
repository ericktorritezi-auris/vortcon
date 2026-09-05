import { z } from 'zod';

/**
 * Política de senha (requisito de produto). Importante deixar registrado o
 * porquê NÃO existe bloqueio de caracteres especiais aqui: a senha nunca
 * toca o banco em texto puro (vira hash Argon2id antes de qualquer escrita
 * — Seção 26) e todo acesso ao banco passa por queries parametrizadas do
 * Prisma, nunca concatenação de string. Não há caractere que "quebre" o
 * banco nesse desenho — a restrição abaixo é só sobre força da senha.
 *
 * Regras:
 * - mínimo 8 caracteres (máximo 128, sanidade contra senhas absurdamente longas);
 * - ao menos uma letra;
 * - ao menos um número;
 * - ao menos uma letra maiúscula;
 * - ao menos um caractere especial (qualquer símbolo comum de teclado — @ incluso, sem restrição).
 */
export const PASSWORD_POLICY_DESCRIPTION =
  'Mínimo de 8 caracteres, com ao menos uma letra maiúscula, um número e um caractere especial (ex.: @, #, !, %).';

const HAS_LETTER = /[a-zA-Z]/;
const HAS_DIGIT = /\d/;
const HAS_UPPERCASE = /[A-Z]/;
const HAS_SPECIAL_CHAR = /[^a-zA-Z0-9\s]/; // qualquer símbolo — @ # ! % & * etc. — nenhum é bloqueado

export const passwordSchema = z
  .string()
  .min(8, PASSWORD_POLICY_DESCRIPTION)
  .max(128, 'Senha excede o tamanho máximo permitido.')
  .refine((value) => HAS_LETTER.test(value), { message: PASSWORD_POLICY_DESCRIPTION })
  .refine((value) => HAS_DIGIT.test(value), { message: PASSWORD_POLICY_DESCRIPTION })
  .refine((value) => HAS_UPPERCASE.test(value), { message: PASSWORD_POLICY_DESCRIPTION })
  .refine((value) => HAS_SPECIAL_CHAR.test(value), { message: PASSWORD_POLICY_DESCRIPTION });
