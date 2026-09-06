# Módulo: recurrence

Séries recorrentes, ocorrências, edição futura e materialização (Seções 69-75).

## Implementado (Estágio 8)

- `date-sequence.ts` — cálculo puro de datas de ocorrência (DAILY/WEEKLY/MONTHLY/YEARLY/
  CUSTOM_DAYS), sem I/O, com clamping correto de dia (dia 31 caindo em fevereiro vira
  dia 28/29). 7 testes unitários reais.
- `recurrence.repository.ts` / `recurrence.service.ts`:
  - `createRecurrenceSeries` — cria a série e já materializa a primeira janela
    (Seção 75, 90 dias — "janela futura razoável", nunca infinita).
  - `materializeSeriesOccurrences` — idempotente, nunca duplica (protegido também por
    constraint única no banco em `[recurrenceSeriesId, recurrenceOccurrenceKey]`,
    Seção 71). Substituto reativo de job agendado até o Estágio 13, mesmo padrão já
    usado para mensalidades no Estágio 6.
  - `alterRecurrenceForward` — "Alterar recorrência" (Seção 73): muda a série e as
    ocorrências futuras PENDING, nunca as liquidadas/canceladas/históricas.
  - `endRecurrenceSeries` — encerra a série (Seção 74) sem apagar ocorrências já
    materializadas.
- Edição de uma ocorrência isolada (Seção 72) não precisa de lógica própria — é só um
  `UPDATE` normal na `FinancialTransaction` já materializada (Estágio 7), e a série
  nunca é tocada por isso.

Teste de integração (`recurrence-flow.test.ts`) reproduz o exemplo exato da Seção 72
(R$ 1.000/dia 14 → outubro R$ 1.500/dia 15 → novembro volta a R$ 1.000/dia 14) e o
último item da suíte financeira obrigatória da Seção 170.
