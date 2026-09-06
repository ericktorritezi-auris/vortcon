-- AlterTable: transferência recorrente (Seção 66 — campo estava faltando desde o Estágio 7)
ALTER TABLE "transfers" ADD COLUMN "recurrenceSeriesId" TEXT;

-- AddForeignKey
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_recurrenceSeriesId_fkey" FOREIGN KEY ("recurrenceSeriesId") REFERENCES "recurrence_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
