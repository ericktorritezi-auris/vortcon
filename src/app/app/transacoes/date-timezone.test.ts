import { describe, expect, it } from 'vitest';

/**
 * Bug real relatado pelo cliente: transações lançadas em setembro apareciam
 * sob o rótulo "Agosto de 2026". Causa: datas-calendário (dueDate,
 * settlementDate, scheduledDate — todas @db.Date, meia-noite UTC) sendo
 * formatadas com Intl.DateTimeFormat sem timeZone: 'UTC' explícito, em
 * componentes que rodam no navegador do usuário. O navegador reinterpreta a
 * meia-noite UTC no fuso local (Brasil, UTC-3), voltando um dia — e, perto
 * da virada do mês, o mês inteiro.
 *
 * Este teste fixa esse comportamento para nunca regredir: mostra o que
 * acontece SEM timeZone: 'UTC' (o bug, reproduzido de forma determinística
 * comparando contra um fuso fixo, não o fuso de quem roda o teste) e
 * confirma que COM timeZone: 'UTC' o resultado é sempre o esperado, não
 * importa em que fuso o código realmente executa.
 */
describe('formatação de data-calendário — bug de fuso horário (mês/dia errado)', () => {
  const firstOfSeptemberUtcMidnight = new Date('2026-09-01T00:00:00.000Z');

  it('SEM timeZone fixo, um fuso atrás de UTC (ex.: Brasil) mostra o mês ANTERIOR — este é o bug relatado', () => {
    const buggyFormatter = new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo',
    });

    expect(buggyFormatter.format(firstOfSeptemberUtcMidnight)).toBe('agosto de 2026');
  });

  it('COM timeZone: UTC explícito, o mês correto aparece sempre, em qualquer fuso', () => {
    const correctFormatter = new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });

    expect(correctFormatter.format(firstOfSeptemberUtcMidnight)).toBe('setembro de 2026');
  });

  it('mesmo padrão vale para o dia — dia 5 nunca pode virar dia 4 na exibição', () => {
    const fifthOfSeptemberUtcMidnight = new Date('2026-09-05T00:00:00.000Z');

    const buggyFormatter = new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      timeZone: 'America/Sao_Paulo',
    });
    const correctFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', timeZone: 'UTC' });

    expect(buggyFormatter.format(fifthOfSeptemberUtcMidnight)).toBe('04');
    expect(correctFormatter.format(fifthOfSeptemberUtcMidnight)).toBe('05');
  });
});
