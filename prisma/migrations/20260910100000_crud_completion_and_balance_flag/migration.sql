-- Pedido do cliente: lançamento pode existir só como histórico, sem
-- influenciar o saldo real das contas.
ALTER TABLE "financial_transactions" ADD COLUMN "affectsBalance" BOOLEAN NOT NULL DEFAULT true;

-- Correção de bug real: série recorrente nunca propagava nota nem tags
-- pras ocorrências materializadas, só a descrição.
ALTER TABLE "recurrence_series" ADD COLUMN "defaultNote" TEXT;
ALTER TABLE "recurrence_series" ADD COLUMN "defaultAffectsBalance" BOOLEAN NOT NULL DEFAULT true;

-- Tags padrão de uma série recorrente (join table, mesmo padrão de
-- financial_transaction_tags).
CREATE TABLE "recurrence_series_tags" (
    "recurrenceSeriesId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "recurrence_series_tags_pkey" PRIMARY KEY ("recurrenceSeriesId", "tagId")
);

ALTER TABLE "recurrence_series_tags" ADD CONSTRAINT "recurrence_series_tags_recurrenceSeriesId_fkey"
    FOREIGN KEY ("recurrenceSeriesId") REFERENCES "recurrence_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "recurrence_series_tags" ADD CONSTRAINT "recurrence_series_tags_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
