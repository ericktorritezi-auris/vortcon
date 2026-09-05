# Módulo: admin

Painel Admin operacional — nunca acessa dados financeiros do tenant (Seções 22-23, 148, 184).

## Implementado (Estágio 6)

- `admin-access.service.ts` — guard simples (`evaluateAdminAccess`), deliberadamente mais
  enxuto que o `AccessPolicyService` do tenant (Admin não tem lifecycle/bloqueios/legal
  para checar, só identidade + papel).
- `admin-dashboard.service.ts` — métricas da Seção 148, sem patrimônio privado.
- `admin-bootstrap.service.ts` — criação segura do primeiro `GLOBAL_ADMIN` (Seção 162),
  via `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_TOKEN`, reaproveitando o fluxo de convite
  do Estágio 4 (sem senha hardcoded). O link de ativação é sempre logado no console,
  independente do Resend conseguir entregar o e-mail — necessário para quando o e-mail
  configurado não é uma caixa real.

Páginas em `src/app/admin/*`.
