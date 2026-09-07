-- CreateTable (Estágio 11 — Seção 38 já previa esta entidade)
CREATE TABLE "cockpit_acknowledgements" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cockpit_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cockpit_acknowledgements_tenantId_month_key" ON "cockpit_acknowledgements"("tenantId", "month");

-- AddForeignKey
ALTER TABLE "cockpit_acknowledgements" ADD CONSTRAINT "cockpit_acknowledgements_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
