-- Evolução v1.2 — módulo Programações. Universo separado do financeiro
-- (Financial Engine, Dashboard, Cockpit, Relatórios nunca leem essas
-- tabelas). Único ponto de contato: programming_entries.generatedTransactionId,
-- escrito só no momento explícito de "Gerar transação".

CREATE TYPE "ProgrammingEntryStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- Origem (Empréstimo, Financiamento...) — sem iconografia, de propósito.
CREATE TABLE "programming_origins" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programming_origins_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "programming_origins_tenantId_idx" ON "programming_origins"("tenantId");
ALTER TABLE "programming_origins" ADD CONSTRAINT "programming_origins_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Beneficiário — cadastro simples, nunca um CRM.
CREATE TABLE "programming_beneficiaries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programming_beneficiaries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "programming_beneficiaries_tenantId_idx" ON "programming_beneficiaries"("tenantId");
ALTER TABLE "programming_beneficiaries" ADD CONSTRAINT "programming_beneficiaries_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Série de recorrência de Programações — tabela própria, nunca
-- recurrence_series (domínio financeiro). defaultOriginId/defaultBeneficiaryId
-- são FKs soltas (sem constraint formal), mesmo padrão de
-- recurrence_series.defaultAccountId.
CREATE TABLE "programming_recurrence_series" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "FinancialTransactionType" NOT NULL,
    "frequency" "RecurrenceFrequency" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "maxOccurrences" INTEGER,
    "baseAmountCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "defaultOriginId" TEXT,
    "defaultBeneficiaryId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programming_recurrence_series_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "programming_recurrence_series_tenantId_active_idx" ON "programming_recurrence_series"("tenantId", "active");
ALTER TABLE "programming_recurrence_series" ADD CONSTRAINT "programming_recurrence_series_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A ocorrência/lançamento em si. convertedAt é permanente (nunca limpo);
-- generatedTransactionId é só o ponteiro atual, pode voltar a NULL se a
-- transação apontada for excluída (SetNull) sem perder a rastreabilidade
-- de que já foi convertida.
CREATE TABLE "programming_entries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "FinancialTransactionType" NOT NULL,
    "originId" TEXT,
    "beneficiaryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "entryDate" DATE NOT NULL,
    "status" "ProgrammingEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "cancelledAt" TIMESTAMP(3),
    "recurrenceSeriesId" TEXT,
    "recurrenceOccurrenceKey" TEXT,
    "generatedTransactionId" TEXT,
    "convertedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programming_entries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "programming_entries_recurrenceSeriesId_recurrenceOccurrenceKey_key"
    ON "programming_entries"("recurrenceSeriesId", "recurrenceOccurrenceKey");
CREATE INDEX "programming_entries_tenantId_entryDate_idx" ON "programming_entries"("tenantId", "entryDate");
CREATE INDEX "programming_entries_tenantId_beneficiaryId_idx" ON "programming_entries"("tenantId", "beneficiaryId");
CREATE INDEX "programming_entries_tenantId_status_idx" ON "programming_entries"("tenantId", "status");

ALTER TABLE "programming_entries" ADD CONSTRAINT "programming_entries_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "programming_entries" ADD CONSTRAINT "programming_entries_originId_fkey"
    FOREIGN KEY ("originId") REFERENCES "programming_origins"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "programming_entries" ADD CONSTRAINT "programming_entries_beneficiaryId_fkey"
    FOREIGN KEY ("beneficiaryId") REFERENCES "programming_beneficiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "programming_entries" ADD CONSTRAINT "programming_entries_recurrenceSeriesId_fkey"
    FOREIGN KEY ("recurrenceSeriesId") REFERENCES "programming_recurrence_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "programming_entries" ADD CONSTRAINT "programming_entries_generatedTransactionId_fkey"
    FOREIGN KEY ("generatedTransactionId") REFERENCES "financial_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
