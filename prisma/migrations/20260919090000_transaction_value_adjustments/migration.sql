-- Evolução v1.7 — histórico de ajustes de valor por transação (pedido do
-- cliente). Tabela nova, nenhuma coluna existente muda. Nunca lida pelo
-- Financial Engine nem por nenhum cálculo — só documenta como o valor de
-- uma transação foi mudando ao longo do tempo (usado em lançamentos de
-- planejamento, ex.: nasce com R$ 0,01 e vai somando durante o mês).

CREATE TABLE "transaction_value_adjustments" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "deltaCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_value_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "transaction_value_adjustments_transactionId_createdAt_idx"
    ON "transaction_value_adjustments"("transactionId", "createdAt");

ALTER TABLE "transaction_value_adjustments" ADD CONSTRAINT "transaction_value_adjustments_transactionId_fkey"
    FOREIGN KEY ("transactionId") REFERENCES "financial_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
