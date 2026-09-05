# Módulo: transactions

Receitas e despesas unificadas em financial_transactions — status, liquidação, cancelamento (Seções 54-62, 76-80).

## Implementado (Estágio 7)

- `transaction.repository.ts` / `transaction.service.ts` — criar (já liquidada ou
  pendente, Seção 56), liquidar (Seção 62), cancelar/reativar (Seção 61), ignorar
  (Seção 60), gerenciar tags.
- Validação de ownership (Seção 210): `accountId`/`categoryId`/`tagIds` recebidos são
  sempre confirmados como pertencentes ao mesmo tenant antes de qualquer escrita.
- UI (formulários, drawer, filtros, mobile) é o Estágio 9 — este módulo é só a camada
  de domínio.
