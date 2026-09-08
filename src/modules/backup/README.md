# Módulo: backup

Backup e restauração por tenant (Seção 140-146).

## Implementado (Estágio 15)

- `backup-format.ts` — tipos do formato de backup + lógica pura de validação
  (`validateBackup`: versão, vínculo de tenant, checksum) e prévia (`buildBackupPreview`).
  Testado isoladamente (7 testes), incluindo o caso mais crítico: um backup de um
  tenant sendo rejeitado ao tentar restaurar em outro (Seção 144 — "não fornecer dump
  multitenant").
- `backup.service.ts`:
  - `exportTenantBackup(tenantId)` — exporta exatamente o conteúdo da Seção 143
    (contas, saldos iniciais, categorias/tags globais, receitas/despesas,
    associações, transferências, recorrências) e nunca o que a Seção 143 exclui
    explicitamente (senha, sessão, token, segredo, push secret, dado de outro
    tenant). `tenantId` sempre resolvido pelo backend (sessão ou tenant já validado
    pelo Admin) — nunca confiado do frontend (Seção 142).
  - `restoreTenantBackup(tenantId, backup, adminUserId)` — pipeline exato da Seção
    145: valida → (preview já feito antes, na UI) → confirmação (a própria chamada)
    → backup de segurança (exporta o estado atual antes de tocar em qualquer coisa,
    devolvido para download) → transaction → restore → auditoria. Toda a
    substituição de dados roda dentro de uma única transação Postgres — qualquer
    falha no meio reverte tudo automaticamente, nunca um estado parcialmente
    restaurado. Validado via SQL direto: uma falha proposital no meio de uma
    transação equivalente confirmou que o `ROLLBACK` reverte 100% das mudanças.
  - IDs nunca são reaproveitados na restauração — cada registro ganha um ID novo, com
    o remapeamento de referências (conta→categoria→tag→transação) feito em memória
    durante a própria transação.
- Admin-only V1 (Seção 145) — só a rota `/api/admin/tenants/[id]/backup/restore`
  pode restaurar; o tenant só pode exportar o próprio backup
  (`/api/backup/export`), nunca restaurar sozinho.
- Auditoria (Seção 146) — toda restauração gera um `AuditEvent` com o admin
  responsável, reaproveitando a infraestrutura já existente desde o Estágio 6.

Teste de integração (`backup.test.ts`) valida contra PostgreSQL real o ciclo
completo: exportar → apagar tudo → restaurar → conferir que os dados voltam com o
mesmo conteúdo e as referências corretamente religadas com IDs novos.

## Backup de infraestrutura (Seção 141)

Documentado separadamente em `/docs/backup-infraestrutura.md` — não é código da
aplicação, é a estratégia de backup do Postgres no Railway (volume backups, PITR,
dump lógico) e o runbook de qual camada usar em cada cenário.
