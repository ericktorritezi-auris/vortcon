-- Evolução v1.6 — Toggle de tema claro/escuro (Estágio 19). Preferência
-- persistida por usuário para acompanhar entre dispositivos; DEFAULT
-- 'LIGHT' preserva exatamente o comportamento atual para todo usuário já
-- existente (nenhuma linha muda de aparência sem ação explícita da pessoa).

CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK');

ALTER TABLE "users" ADD COLUMN "themePreference" "ThemePreference" NOT NULL DEFAULT 'LIGHT';
