# Módulo: admin

Painel Admin operacional — nunca acessa dados financeiros do tenant (Seções 22-23, 148, 184).

## Implementado

- `admin-access.service.ts` — guard simples (`evaluateAdminAccess`), deliberadamente mais
  enxuto que o `AccessPolicyService` do tenant (Admin não tem lifecycle/bloqueios/legal
  para checar, só identidade + papel).
- `admin-dashboard.service.ts` — as 10 métricas da Seção 148, sem patrimônio privado.
- `admin-bootstrap.service.ts` — criação segura do primeiro `GLOBAL_ADMIN` (Seção 162),
  via `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_TOKEN`, reaproveitando o fluxo de convite
  do Estágio 4 (sem senha hardcoded). O link de ativação é sempre logado no console,
  independente do Resend conseguir entregar o e-mail.
- `factory-reset.service.ts` (Estágio 19, adicionado à especificação a pedido do
  cliente) — zera todo dado de teste (tenants, usuários incl. admin, dados financeiros,
  auditoria) preservando o plano comercial e o conteúdo legal real. Uso único garantido
  por um marcador (`factory_reset_log`) que a própria operação nunca apaga. Validado
  manualmente e de forma exaustiva contra PostgreSQL 16 local (populado um cenário
  completo, conferida linha a linha a preservação/exclusão); o teste de integração
  automatizado cobre só os caminhos que não tocam dados (token/confirmação inválidos),
  de propósito — um wipe real dentro da suíte de CI compartilhada derrubaria os outros
  testes de integração rodando em paralelo contra o mesmo banco.

Páginas em `src/app/admin/*`.
