-- CreateEnum
CREATE TYPE "RecurrenceFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY', 'CUSTOM_DAYS');

-- CreateTable
CREATE TABLE "recurrence_series" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "transactionType" "FinancialTransactionType" NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "maxOccurrences" INTEGER,
    "baseAmountCents" INTEGER NOT NULL,
    "baseDueRule" JSONB,
    "defaultAccountId" TEXT NOT NULL,
    "defaultCategoryId" TEXT,
    "defaultReminderEnabled" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recurrence_series_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recurrence_series_tenantId_active_idx" ON "recurrence_series"("tenantId", "active");

-- AddForeignKey
ALTER TABLE "recurrence_series" ADD CONSTRAINT "recurrence_series_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: vincular financial_transactions à série (Seção 71)
ALTER TABLE "financial_transactions" ADD COLUMN "recurrenceSeriesId" TEXT;
ALTER TABLE "financial_transactions" ADD COLUMN "recurrenceOccurrenceKey" TEXT;

-- CreateIndex (impede duplicação de ocorrência — Seção 71)
CREATE UNIQUE INDEX "financial_transactions_recurrenceSeriesId_recurrenceOccurr_key" ON "financial_transactions"("recurrenceSeriesId", "recurrenceOccurrenceKey");

-- AddForeignKey
ALTER TABLE "financial_transactions" ADD CONSTRAINT "financial_transactions_recurrenceSeriesId_fkey" FOREIGN KEY ("recurrenceSeriesId") REFERENCES "recurrence_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
