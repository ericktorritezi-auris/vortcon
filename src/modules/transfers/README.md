# Módulo: transfers

Transferências entre contas — entidade própria, não distorce resultado (Seções 66-68).

## Implementado (Estágio 7)

`transfer.service.ts` — criar (pendente ou já concluída), concluir, cancelar. Pendente
nunca altera saldo real (só `COMPLETED` conta no Financial Engine). Transferência
nunca é receita nem despesa — sempre neutra no resultado do período.

## Correção pós-Estágio 11

`unsettleTransfer` (COMPLETED → PENDING, limpando a data de liquidação) — a pedido
explícito do cliente, para poder reverter uma transferência marcada como concluída
por engano, sem precisar cancelar (que é definitivo). UI de detalhe clicável
(`TransferDetailDrawer.tsx`) criada — antes a listagem não tinha nenhuma interação.
Teste de integração dedicado (`transfers-flow.test.ts`, 9 cenários) — nunca tinha
existido; a matemática de saldo só tinha sido validada via SQL direto até então.
