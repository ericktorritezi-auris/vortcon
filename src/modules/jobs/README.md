# Módulo: jobs

Os 8 jobs agendados (Seção 127) e o motor de idempotência (Seção 128).

## Implementado (Estágio 13)

- `job-runner.ts` — `runIdempotent(jobName, idempotencyKey, fn)`: a proteção real
  contra double-click/retry/worker duplicado é a constraint única
  `(jobName, idempotencyKey)` no banco — nunca uma checagem em memória. Validado com
  3 tentativas concorrentes da mesma chave via SQL direto: só 1 linha é criada.
- `timezone-clock.ts` — "às 08:00 no timezone do tenant" (Seção 117) exige saber a
  hora atual e "hoje" em qualquer fuso IANA, não no fuso do servidor (Railway roda em
  UTC). Testado provando que o mesmo instante UTC dá horas diferentes em fusos
  diferentes.
- `jobs.service.ts` — os 8 jobs da Seção 127:
  - `RECURRENCE_MATERIALIZATION` e `SUBSCRIPTION_DELINQUENCY_BLOCK` reaproveitam
    lógica já existente desde os Estágios 8 e 6 — este estágio só as torna
    agendáveis via cron, com idempotência.
  - `FINANCIAL_DUE_REMINDERS`, `SUBSCRIPTION_REMINDERS` são novos — respeitam o
    fuso de cada usuário individualmente.
  - `MONTH_ROLLOVER`, `TOKEN_CLEANUP`, `OUTBOX_PROCESSING` são novos.
  - `BACKUP_MAINTENANCE` é um **stub documentado** — a funcionalidade real depende
    do Estágio 15 (Backup), ainda não construído. Registrado aqui de propósito
    (a Seção 127 já prevê o nome), mas nunca finge fazer algo que não faz.
- Disparo via `/api/jobs/run?job=NOME`, protegido por `CRON_SECRET` — feito para ser
  chamado pelo Cron do Railway (ou serviço externo equivalente), nunca exposto sem
  autenticação.
