import { describe, expect, it } from 'vitest';
import {
  computeDaysPastDue,
  DELINQUENCY_GRACE_DAYS,
  isOverdueEnoughToBlock,
} from './delinquency-rules';

describe('delinquency-rules (Seção 113/174 — fronteira exata da carência)', () => {
  it('a carência é de 5 dias (Seção 113: vencimento dia 10, bloqueio dia 15)', () => {
    expect(DELINQUENCY_GRACE_DAYS).toBe(5);
  });

  it('4 dias de atraso NUNCA bloqueia — ainda dentro da carência', () => {
    const today = new Date('2026-09-10T12:00:00.000Z');
    const dueDate = new Date('2026-09-06T00:00:00.000Z'); // 4 dias antes
    expect(computeDaysPastDue(dueDate, today)).toBe(4);
    expect(isOverdueEnoughToBlock(dueDate, today)).toBe(false);
  });

  it('exatamente 5 dias de atraso SEMPRE bloqueia — fronteira exata', () => {
    const today = new Date('2026-09-10T12:00:00.000Z');
    const dueDate = new Date('2026-09-05T00:00:00.000Z'); // 5 dias antes
    expect(computeDaysPastDue(dueDate, today)).toBe(5);
    expect(isOverdueEnoughToBlock(dueDate, today)).toBe(true);
  });

  it('6 dias de atraso continua bloqueando (bem depois da fronteira)', () => {
    const today = new Date('2026-09-10T12:00:00.000Z');
    const dueDate = new Date('2026-09-04T00:00:00.000Z');
    expect(isOverdueEnoughToBlock(dueDate, today)).toBe(true);
  });

  it('vencimento hoje (0 dias de atraso) nunca bloqueia', () => {
    const today = new Date('2026-09-10T12:00:00.000Z');
    const dueDate = new Date('2026-09-10T00:00:00.000Z');
    expect(isOverdueEnoughToBlock(dueDate, today)).toBe(false);
  });

  it('vencimento no futuro nunca bloqueia (nunca dá dias negativos passando o limite)', () => {
    const today = new Date('2026-09-10T12:00:00.000Z');
    const dueDate = new Date('2026-09-15T00:00:00.000Z');
    expect(isOverdueEnoughToBlock(dueDate, today)).toBe(false);
  });
});
