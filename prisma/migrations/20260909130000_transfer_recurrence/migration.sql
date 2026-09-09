-- CreateEnum
CREATE TYPE "RecurrenceKind" AS ENUM ('TRANSACTION', 'TRANSFER');

-- AlterTable: recurrence_series ganha kind + campos de transferência;
-- transactionType e defaultAccountId passam a ser opcionais (só usados
-- quando kind = TRANSACTION).
ALTER TABLE "recurrence_series" ADD COLUMN "kind" "RecurrenceKind" NOT NULL DEFAULT 'TRANSACTION';
ALTER TABLE "recurrence_series" ADD COLUMN "description" TEXT;
ALTER TABLE "recurrence_series" ALTER COLUMN "transactionType" DROP NOT NULL;
ALTER TABLE "recurrence_series" ALTER COLUMN "defaultAccountId" DROP NOT NULL;
ALTER TABLE "recurrence_series" ADD COLUMN "defaultSourceAccountId" TEXT;
ALTER TABLE "recurrence_series" ADD COLUMN "defaultDestinationAccountId" TEXT;

-- AlterTable: transfers ganha a chave de idempotência de ocorrência,
-- mesmo padrão de financial_transactions.
ALTER TABLE "transfers" ADD COLUMN "recurrenceOccurrenceKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "transfers_recurrenceSeriesId_recurrenceOccurrenceKey_key" ON "transfers"("recurrenceSeriesId", "recurrenceOccurrenceKey");
