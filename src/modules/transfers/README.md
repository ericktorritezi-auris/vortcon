# Módulo: transfers

Transferências entre contas — entidade própria, não distorce resultado (Seções 66-68).

## Implementado (Estágio 7)

`transfer.service.ts` — criar (pendente ou já concluída), concluir, cancelar. Pendente
nunca altera saldo real (só `COMPLETED` conta no Financial Engine). Transferência
nunca é receita nem despesa — sempre neutra no resultado do período.
