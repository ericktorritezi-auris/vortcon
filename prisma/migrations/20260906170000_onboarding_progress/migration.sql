-- CreateTable (Estágio 10 — Seção 38 já previa esta entidade)
CREATE TABLE "onboarding_progress" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tourDismissedAt" TIMESTAMP(3),
    "checklistConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_progress_tenantId_key" ON "onboarding_progress"("tenantId");

-- AddForeignKey
ALTER TABLE "onboarding_progress" ADD CONSTRAINT "onboarding_progress_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
