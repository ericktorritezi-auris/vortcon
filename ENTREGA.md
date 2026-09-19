# ENTREGA — Admin: editar Plano / Condição / Vencimento do Tenant

## VERSÃO

**Sem bump de versão**, por instrução explícita do cliente ("esse ajuste
agora, não muda a versão"). `package.json`, `backup.service.ts`,
`Footer.tsx` e `health/route.ts` permanecem em `1.7.0`, intocados — não
fazem parte desta entrega.

O `CHANGELOG.md` ganhou uma sub-seção "### Adicionado (2026-09-19, sem
mudança de versão)" dentro do próprio cabeçalho `## [1.7.0]` já existente,
em vez de um novo cabeçalho de versão — assim o registro fica documentado
sem sugerir um novo número de versão.

## RESUMO

Na tela de detalhe do tenant (Admin → Tenants → tenant), a seção
"Assinatura" ganhou um formulário de edição logo abaixo do resumo
read-only já existente, permitindo ao Admin alterar:

- **Plano contratado** — seletor com todos os planos (inclusive inativos,
  rotulados "(inativo)", pra não sumir da lista se o tenant já estiver
  nele).
- **Condição** — toggle Pagante ↔ Isento.
- **Vencimento** — dia do mês (1–28).

Um único botão "Salvar alterações" envia os três campos juntos num só
PATCH.

### Regras de negócio

As 3 decisões confirmadas com você antes de implementar, cada uma com a
opção recomendada que você escolheu:

1. **Trocar o Plano re-precifica o contrato.** `contractedPriceCents`
   passa a ser o preço atual do novo plano escolhido. (Continua valendo a
   Seção 107 pra contratos que o Admin não mexe — preço muda no catálogo
   nunca afeta contrato já existente; aqui é diferente porque é o Admin
   escolhendo explicitamente outro plano pra este tenant.)
2. **Virar Isento (vindo de Pagante) cancela mensalidades PENDENTES e
   levanta bloqueio de inadimplência ativo.** Bate com a Seção 108
   ("isento sem dívida artificial"). Mensalidades já **pagas** nunca são
   tocadas — ficam intactas no histórico. Se havia um bloqueio
   `DELINQUENCY` ativo, ele é levantado automaticamente (evento de outbox
   `TenantUnblocked` disparado, mesmo padrão do pagamento manual).
3. **Mudar o Vencimento nunca reescreve uma mensalidade já existente**
   (mesmo pendente) — vale só a partir da próxima cobrança que
   `ensureCurrentMonthCharge` gerar.

Toda alteração fica registrada em `AuditEvent`
(`TENANT_SUBSCRIPTION_UPDATED`, ator `GLOBAL_ADMIN`, com o id do Admin que
fez a mudança).

## ARQUIVOS NOVOS

- `src/app/api/admin/tenants/[id]/subscription/route.ts` — endpoint
  `PATCH`, valida com zod (`planId?`, `condition?`, `dueDay?` — todos
  opcionais), checa acesso Admin (`evaluateAdminAccess`), delega pra
  `updateTenantSubscription`.

## ARQUIVOS ALTERADOS

- `src/modules/subscriptions/subscription.repository.ts` — nova função
  `updateSubscription(tenantId, data, client?)`, aceita client de
  transação opcional (usada junto com o cancelamento de pendentes dentro
  da mesma transação).
- `src/modules/subscriptions/subscription.service.ts` — nova função
  exportada `updateTenantSubscription(tenantId, adminUserId, input)`, com
  toda a lógica de negócio acima (validação de `dueDay`, re-precificação,
  cancelamento de pendentes + desbloqueio, auditoria). Doc comment extenso
  documentando as 3 decisões confirmadas.
- `src/app/admin/tenants/[id]/TenantActions.tsx` — novo componente
  `EditSubscriptionForm` (client component), o formulário em si.
- `src/app/admin/tenants/[id]/page.tsx` — busca `listPlans()` (todos os
  planos, não só ativos) e renderiza `<EditSubscriptionForm>` abaixo do
  resumo da Assinatura.
- `tests/integration/commercial-flow.test.ts` — nova suíte `describe`
  isolada ("Admin edita assinatura do tenant"), com tenant e planos
  próprios (não compartilha estado com a suíte de fluxo comercial
  existente). 5 novos testes: re-precificação ao trocar plano; Isento
  cancela pendente + levanta bloqueio + preserva paga; Vencimento não
  reescreve cobrança existente; validação de `dueDay` fora de 1–28;
  evento de auditoria gravado.
- `CHANGELOG.md` — nota adicionada sob o cabeçalho `[1.7.0]` existente
  (sem novo número de versão, conforme explicado acima).

## MIGRATIONS

Nenhuma. Este ajuste usa exclusivamente campos já existentes em
`TenantSubscription` (`planId`, `contractedPriceCents`, `condition`,
`dueDay`) — nenhuma mudança de schema.

## QA EXECUTADO

- `npx eslint` nos 6 arquivos desta entrega — sem erros.
- `npx prettier --check` nos 6 arquivos + `CHANGELOG.md` — todos já no
  padrão (nenhuma reformatação necessária).
- `npx vitest run --exclude "tests/integration/**"` — **159/159 testes
  unitários passando** (suíte completa, 23 arquivos).
- `npx tsc --noEmit` — contagem total de erros permaneceu em **87 linhas**
  (mesmo número de antes desta mudança), todas do mesmo "muro" genérico
  documentado desde o Estágio 1 (`@prisma/client` "no exported member" —
  limitação do sandbox, não afeta o build real no Railway/GitHub Actions).
  Nenhum erro novo de lógica.
- Os 5 novos testes de integração (`commercial-flow.test.ts`) foram
  escritos seguindo exatamente as convenções já estabelecidas no arquivo
  (helpers `createTestPlan`/`cleanupTenant`/`deleteTestPlan`,
  `firstDueDateNextMonth()`), mas **não puderam ser executados neste
  sandbox** (o binário de engine do Prisma usado pelos testes de
  integração via Vitest está bloqueado por rede aqui — limitação já
  documentada e aceita desde o início do projeto). Vão rodar normalmente
  no GitHub Actions, que não tem essa restrição.

## COMO SUBIR

Sem migration, então basta subir os arquivos alterados/novos pro GitHub
(mesmos caminhos) e o deploy no Railway segue normal — não precisa de
nenhum passo manual adicional.
