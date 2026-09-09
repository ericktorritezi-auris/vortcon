import { describe, expect, it } from 'vitest';
import { shouldSuppressReminder } from './notification-suppression';
import { isExpiredSubscriptionError } from './push-error-classification';

describe('shouldSuppressReminder (Seção 118)', () => {
  it('nunca suprime uma transação pendente e não ignorada', () => {
    expect(shouldSuppressReminder({ status: 'PENDING', ignored: false })).toBe(false);
  });

  it('suprime quando paga', () => {
    expect(shouldSuppressReminder({ status: 'PAID', ignored: false })).toBe(true);
  });

  it('suprime quando recebida', () => {
    expect(shouldSuppressReminder({ status: 'RECEIVED', ignored: false })).toBe(true);
  });

  it('suprime quando cancelada', () => {
    expect(shouldSuppressReminder({ status: 'CANCELLED', ignored: false })).toBe(true);
  });

  it('suprime quando ignorada, mesmo ainda pendente', () => {
    expect(shouldSuppressReminder({ status: 'PENDING', ignored: true })).toBe(true);
  });
});

describe('isExpiredSubscriptionError (Seção 176 — "push inválido")', () => {
  it('reconhece 404 e 410 como inscrição expirada/inválida', () => {
    expect(isExpiredSubscriptionError(404)).toBe(true);
    expect(isExpiredSubscriptionError(410)).toBe(true);
  });

  it('nunca trata outros códigos (ex.: 500, 400, undefined) como inscrição inválida', () => {
    expect(isExpiredSubscriptionError(500)).toBe(false);
    expect(isExpiredSubscriptionError(400)).toBe(false);
    expect(isExpiredSubscriptionError(undefined)).toBe(false);
  });
});
