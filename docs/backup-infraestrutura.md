# Backup de Infraestrutura (Seção 141)

Este documento cobre o backup do **banco de dados como um todo** (Railway/Postgres)
— separado do backup **por tenant** (Seção 142-146), que é uma funcionalidade da
própria aplicação (módulo `backup`, ver `src/modules/backup/README.md`).

## As três camadas de proteção do Railway

O Postgres do Railway oferece três camadas, cada uma cobrindo um cenário diferente
de perda de dados. A recomendação do próprio Railway é usar as três em produção —
não são alternativas entre si, são complementares.

### 1. Volume backups (snapshots agendados)

Snapshot do volume inteiro onde o Postgres guarda os dados. Incremental e
copy-on-write — só paga pelo que muda entre um snapshot e outro.

**Configuração recomendada para o VortCon:**

- Serviço Postgres → aba **Backups** → agendar snapshot **diário**
- Retenção: pelo menos 14 dias (ajustar conforme orçamento)

**Restauração:** localizar o snapshot pela data → clicar em **Restore**. Só pode
restaurar dentro do mesmo projeto + ambiente.

### 2. Point-in-Time Recovery — PITR (janela de 7 dias, por segundo)

Usa WAL archiving contínuo — permite restaurar pra qualquer segundo específico
dentro dos últimos 7 dias, não só pro horário do último snapshot. Essencial pra
cenários como "um bug apagou dados às 14h32 de hoje, preciso do estado de 14h31".

**Ativação:** `railway postgres pitr enable --service postgres`

**Restauração pra um instante específico:**

```
railway postgres pitr restore --service postgres --at 2026-09-08T14:31:00Z
```

Importante: a restauração **cria um novo serviço Postgres ao lado do original**
(nunca sobrescreve o original enquanto ele continua servindo tráfego). Depois de
restaurar, é preciso: (1) conferir que os dados no novo serviço estão corretos,
(2) trocar a variável `DATABASE_URL` do serviço VortCon pra apontar pro novo
Postgres, (3) só então desligar/remover o Postgres antigo.

### 3. Dump lógico (`pg_dump`/`pg_restore`) — a camada que sobrevive a tudo

As duas camadas acima são do Railway — se o projeto inteiro for excluído, elas vão
junto. Um dump lógico exportado e guardado em outro lugar (fora do Railway) é a
única cópia que sobrevive a esse cenário extremo.

**Gerar (rodar localmente, com as credenciais do Postgres do Railway):**

```
pg_dump -U <PGUSER> -h <PGHOST> -p <PGPORT> -W -F t <PGDATABASE> > vortcon_backup.dump
```

**Restaurar (em qualquer Postgres, inclusive um novo projeto do zero):**

```
pg_restore -U <PGUSER> -h <PGHOST> -p <PGPORT> -W -F t -d <PGDATABASE> vortcon_backup.dump
```

Recomendação: rodar isso manualmente uma vez por mês (ou automatizar com um cron
job simples), guardando o arquivo fora do Railway (ex.: um bucket S3 separado).

## Runbook de recuperação — qual camada usar em cada cenário

| Cenário                                                                                                        | Camada a usar                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Preciso do estado de um horário específico nas últimas 24-48h" (ex.: bug que corrompeu dados numa hora exata) | PITR                                                                                                                                               |
| "O snapshot de ontem está bom, restaura pra ele"                                                               | Volume backup                                                                                                                                      |
| "O projeto Railway inteiro foi excluído ou preciso migrar de provedor"                                         | Dump lógico mais recente                                                                                                                           |
| "Um tenant específico teve dados corrompidos, o resto do banco está ok"                                        | **Não usar nenhuma das três** — usar o backup por tenant da própria aplicação (Seção 142-146), que restaura só aquele tenant, sem afetar os outros |

## Por que isso nunca é a mesma coisa que o backup por tenant

As três camadas acima operam no **banco inteiro** — todos os tenants juntos. Restaurar
qualquer uma delas pra corrigir o dado de UM tenant específico reverteria também
todos os outros tenants pro mesmo horário, o que quase sempre é errado (Seção 140:
"separar infraestrutura; tenant"). Para esse caso — o mais comum na prática — use
sempre o backup/restauração por tenant já construído na aplicação.
