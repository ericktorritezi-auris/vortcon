# Módulo: financial-engine

Núcleo central de cálculo financeiro — único consumido por Dashboard, Cockpit, Reports e Insights (Seções 63-65, 202-204).

## Implementado (Estágio 7)

`financial-exclusions.ts` — filtro único de exclusão (cancelado/ignorado nunca contam,
Seção 59), reutilizado por toda função do engine.

`financial-engine.service.ts` — contrato completo da Seção 63: `getRealBalance`,
`getAccountBalances`, `getPeriodIncome/Expenses/Result`, `getPendingPayables/Receivables`,
`getProjectedBalance`, `getCategoryBreakdown` (nunca assume categoria de despesa, Seção
64), `getCategoryFlow`, `getTagFlow`, `getDailyTotals`, `getMonthlyEvolution`.

Testado pela suíte obrigatória de `tests/integration/financial-engine-mandatory.test.ts`,
cobrindo item a item as Seções 170 (financeiro), 171 (categoria bidirecional) e 172
(tag bidirecional).
