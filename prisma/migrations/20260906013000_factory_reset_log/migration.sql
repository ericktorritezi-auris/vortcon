-- CreateTable (Estágio 19 — marcador de uso único do factory reset)
CREATE TABLE "factory_reset_log" (
    "id" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "factory_reset_log_pkey" PRIMARY KEY ("id")
);
