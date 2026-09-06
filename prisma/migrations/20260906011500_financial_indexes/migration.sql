-- Seção 155: índices compostos recomendados explicitamente para análise de
-- categorias bidirecionais e consultas tenant-escopadas.

-- DropIndex (substituídos por versões compostas com tenantId — toda query
-- real do sistema já inclui tenantId, então o índice composto cobre o
-- mesmo caso de uso com mais precisão)
DROP INDEX "financial_transactions_accountId_idx";
DROP INDEX "financial_transactions_categoryId_idx";

-- CreateIndex
CREATE INDEX "financial_transactions_tenantId_createdAt_idx" ON "financial_transactions"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "financial_transactions_tenantId_accountId_idx" ON "financial_transactions"("tenantId", "accountId");

-- CreateIndex
CREATE INDEX "financial_transactions_tenantId_categoryId_dueDate_idx" ON "financial_transactions"("tenantId", "categoryId", "dueDate");
