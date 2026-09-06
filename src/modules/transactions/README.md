# Módulo: transactions

Receitas e despesas unificadas em financial_transactions — status, liquidação, cancelamento, paginação (Seções 54-62, 76-80).

## Implementado

- `transaction.repository.ts` / `transaction.service.ts` — criar (já liquidada ou
  pendente, Seção 56), **editar** (Seção 78 — nunca toca status/liquidação/cancelamento),
  liquidar (Seção 62), cancelar/reativar (Seção 61), listar com **paginação real**
  (máximo 15 por página, Seção 80 — nunca infinite scroll) e filtro por tipo (Seção 76).
- Validação de ownership (Seção 210): `accountId`/`categoryId`/`tagIds` recebidos são
  sempre confirmados como pertencentes ao mesmo tenant antes de qualquer escrita.
- UI completa no Estágio 9: `/app/transacoes` — abas Despesas/Receitas, navegação por
  mês (default mês atual), listagem agrupada por dia com total do dia (Seção 77),
  drawer de detalhe com as 4 ações (Seção 78), drawer de criação. Cor nunca é único
  indicador (Seção 12) — todo valor usa `FinancialValue` com `showSign`.
- `transaction-grouping.ts` — lógica pura de agrupamento por dia, extraída para ser
  testável isoladamente (5 testes unitários reais, incluindo o exemplo exato da Seção 77).

Teste de integração (`transactions-flow.test.ts`) cobre editar, ownership, pagar/
receber, cancelar→reativar, e paginação com mais de 15 registros.
