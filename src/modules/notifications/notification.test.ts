import { describe, expect, it } from 'vitest';
import { shouldSuppressReminder } from './notification-suppression';

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
