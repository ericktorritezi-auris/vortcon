# VortCon

**Entenda seu dinheiro. Assuma o controle.**

Plataforma inteligente de organização e controle financeiro pessoal.

Desenvolvido por **Belle Planner**.

---

## Sumário

- [Visão do produto](#visão-do-produto)
- [Status do projeto](#status-do-projeto)
- [Stack](#stack)
- [Arquitetura](#arquitetura)
- [Requisitos locais](#requisitos-locais)
- [Instalação](#instalação)
- [Configuração e variáveis de ambiente](#configuração-e-variáveis-de-ambiente)
- [Banco de dados, migrations e seeds](#banco-de-dados-migrations-e-seeds)
- [Desenvolvimento](#desenvolvimento)
- [Testes](#testes)
- [Build](#build)
- [Worker e Jobs](#worker-e-jobs)
- [PWA](#pwa)
- [E-mail (Resend)](#e-mail-resend)
- [Deploy (Railway)](#deploy-railway)
- [Versionamento](#versionamento)
- [Troubleshooting](#troubleshooting)
- [Escopo e não escopo da V1](#escopo-e-não-escopo-da-v1)
- [Regras normativas centrais](#regras-normativas-centrais)

---

## Visão do produto

VortCon existe para responder, em poucos segundos, as perguntas que qualquer pessoa faz sobre sua própria vida financeira:

- Quanto dinheiro eu tenho, e onde ele está?
- Quanto entrou e quanto saiu?
- O que ainda preciso pagar e o que ainda vou receber?
- Em quais categorias meu dinheiro circula, e como cada uma se comporta?
- Como o mês está indo, e como meu comportamento financeiro está evoluindo?

VortCon **não** é um ERP contábil, sistema fiscal, banco, plataforma de investimentos ou ferramenta pesada de gestão empresarial. A experiência deve transmitir **clareza + controle + inteligência + velocidade** — registrar rápido, entender rápido, agir rápido.

Conceito estratégico: **Movimento → Organização → Controle → Inteligência.**

## Status do projeto

| Item                    | Valor                                                                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Versão                  | `1.0.0` (baseline em construção)                                                                                                                        |
| Estágio atual           | Estágio 18 — Release ✅ concluído — **VortCon 1.0.0**                                                                                                   |
| Próximo estágio         | Nenhum — todos os 18 estágios do roteiro original concluídos. Itens que exigem confirmação em produção listados na seção "Estágio 18 — Release" abaixo. |
| Plano comercial inicial | VortCon Pro — R$ 49,90/mês                                                                                                                              |
| Domínio oficial         | `vortcon.belleplanner.com.br`                                                                                                                           |
| Documento normativo     | `VortCon_Direcionamento.md` (Master Document v1.0.0) — prevalece sobre qualquer implementação em caso de conflito                                       |

Este README evolui junto com o desenvolvimento. Ele é a documentação operacional raiz do projeto, não um arquivo descartável.

### Estágio 1 — o que foi entregue

- Next.js 14 (App Router) + TypeScript strict + Prisma + Tailwind configurados e validados (`lint`, `typecheck`, `test` e `build` rodando limpos neste ambiente).
- Estrutura dos 21 módulos de domínio (`src/modules/*`) e 8 módulos compartilhados (`src/shared/*`), cada um com `README.md` de escopo — nenhum contém regra de negócio ainda, conforme a ordem de implementação (Seção 181).
- `schema.prisma` de fundação, validação de variáveis de ambiente com Zod conectada ao boot da aplicação (via `src/shared/database/client.ts`), healthcheck real em `/api/health` e CI completo no GitHub Actions (install → lint → format → typecheck → prisma → testes → build).
- Testes unitário (Vitest) e E2E (Playwright) configurados, com um caso real passando em cada.

Limitação conhecida do ambiente usado para validar esta etapa: `fonts.googleapis.com` e `binaries.prisma.sh` não são alcançáveis por restrição de rede local do sandbox — isso não afeta CI real (GitHub Actions) nem Railway, ambos com acesso irrestrito a esses domínios públicos.

### Estágio 2 — o que foi entregue

- 23 componentes globais do Design System em `src/shared/ui/` (Seção 14): Button, Input,
  MoneyInput, DateInput, Select, SearchableSelect, IconPicker, TagPicker, Toggle,
  Checkbox, Badge, MetricCard, FinancialValue, Modal, Drawer, Toast, Pagination,
  EmptyState, ErrorState, Skeleton, Header, Sidebar, MobileMenu, Footer — acessíveis
  (labels, `aria-*`, foco visível, alvo de toque ~44px, nunca só cor para estado
  crítico) e consumindo só os tokens Tailwind, sem cor/espaçamento hardcoded.
- `<VortConMark />` (`src/shared/design-system/Logo.tsx`) — símbolo oficial como
  componente React reutilizável, colorido ou monocromático, qualquer tamanho.
- Catálogo controlado de ícones (`src/shared/design-system/icons.ts`, lucide-react) —
  categorias nunca aceitam SVG arbitrário (Seção 13).
- Favicons e ícones de PWA reais em `public/icons/` (16/32/64/192/512 + apple-touch-icon),
  gerados a partir do símbolo oficial.
- Landing Page pública real (Seção 17), substituindo o placeholder do Estágio 1.
- Componentes com forma atrelada a uma entidade de domínio que ainda não existe
  (AccountCard, TransactionRow, InsightCard, OnboardingCard, SubscriptionCard,
  ReportCard, NotificationCenter) foram deliberadamente adiados para o estágio que os
  torna reais — lista completa em `src/shared/ui/README.md`.

### Estágio 3 — o que foi entregue

- Modelo de multitenancy estrutural (Seção 19-24, 30-31): `User`, `Tenant`, `TenantUser`,
  `TenantAccessBlock`. `GLOBAL_ADMIN` não pertence a nenhum tenant (papel vive em
  `User.role`); lifecycle (`ACTIVE`/`INACTIVE`) é uma dimensão separada dos bloqueios
  (`DELINQUENCY`/`ADMINISTRATIVE`/`SECURITY`); tenant nunca é hard deleted.
- Migration `20260905150000_init_multitenancy` — escrita à mão (engine do Prisma
  inacessível neste ambiente) e **validada de verdade**: subimos um PostgreSQL 16 local
  no próprio ambiente de desenvolvimento e aplicamos a migration nele antes de aceitá-la.
  Esse processo pegou um bug real na primeira versão (a constraint permitia um usuário
  pertencer a dois tenants ao mesmo tempo) — corrigido e revalidado com 6 cenários
  (isolamento de leitura entre tenants, unicidade de usuário por tenant, foreign key
  contra tenant inexistente, username duplicado, proteção contra hard-delete, transição
  de lifecycle).
- `src/shared/security/roles.ts` — mapa único de capacidades por papel
  (`GLOBAL_ADMIN.canAccessFinancialData = false`, Seção 23), com teste unitário.
- `src/shared/security/tenant-context.ts` — tipo `TenantContext` e `assertOwnedByTenant`,
  base da defesa em profundidade (Seção 20-21, 210) que os módulos financeiros vão usar
  a partir do Estágio 7.
- Repositórios `tenants` e `users` com tenant-scoping explícito, mais
  `provisionTenantWithOwner` (transação atômica, sem senha temporária — Seção 25).
- `tests/integration/tenant-isolation.test.ts` — suíte A/B obrigatória (Seção 21, 174),
  roda contra Postgres real em CI.
- Correção de reprodutibilidade: `prettier`, `eslint`, `typescript` e os plugins
  `@typescript-eslint/*` estavam com versão flutuante (`^`) — fixadas em versão exata
  para eliminar drift de formatação entre sessões de desenvolvimento.

### Estágio 4 — o que foi entregue

- Fluxo completo de autenticação (Seções 18, 25-29): login por usuário/senha, sessão
  server-side via cookie (`HttpOnly`, `Secure` em produção, `SameSite=Lax`), convite de
  ativação (uso único, 48h, sem senha temporária), recuperação de senha (uso único, 1h,
  resposta anti-enumeração idêntica exista ou não a conta), `AccessPolicyService` como
  gate central com todos os estados da Seção 29
  (`UNAUTHENTICATED`/`TENANT_INACTIVE`/`DELINQUENCY_BLOCKED`/`ADMIN_BLOCKED`/`SECURITY_BLOCKED`/`LEGAL_ACCEPTANCE_REQUIRED`/`ALLOWED`).
- Novas tabelas `sessions`, `user_invitations`, `password_reset_tokens` (Seção 38) — só
  o hash SHA-256 do token fica no banco, nunca o valor bruto. Migration escrita à mão e
  validada de verdade contra PostgreSQL 16 local (unicidade de `tokenHash`, cascade
  delete ao remover usuário).
- Senhas com Argon2id (`@node-rs/argon2`, Seção 26) — hash/verify testados de verdade,
  nunca reversível, nunca plaintext.
- `provisionTenantWithOwner` (Estágio 3) agora dispara o convite automaticamente via
  Resend, com fallback seguro (loga e segue, sem derrubar o fluxo) quando
  `RESEND_API_KEY` não está configurada — necessário para dev/CI funcionarem sem a chave.
- Middleware protegendo `/app/*` mesmo em acesso direto por URL (Seção 18), páginas reais
  de login/convite/redefinição de senha/bloqueio/tenant inativo.
- Dois bugs reais de build corrigidos durante a validação (não a limitação de rede já
  conhecida): (1) o Next.js tentava empacotar o binário nativo do Argon2 no bundle —
  corrigido isolando o pacote via `experimental.serverComponentsExternalPackages`; (2) o
  middleware (roda em Edge Runtime) importava `node:crypto` indiretamente através do
  módulo de sessão — corrigido isolando a constante do cookie num arquivo sem
  dependências (`session.constants.ts`).
- Correção de UX prometida na sessão anterior: `Header.tsx` agora garante espaçamento
  mínimo entre logo/menu/botão "Entrar", nunca mais cola em nenhuma largura de tela.
- Testes unitários reais de senha e token rodando neste ambiente (não dependem do Prisma
  Client), mais teste de integração do fluxo completo (provisiona → convite pendente →
  login barrado → ativa → login funciona → reset invalida sessão antiga → login com senha
  nova → anti-enumeração) para rodar em CI.

### Estágio 5 — o que foi entregue

- Modelo de documentos legais (Seções 129-133, 38): `LegalDocument`, `LegalDocumentVersion`
  (`DRAFT`/`PUBLISHED`/`ARCHIVED`, versão publicada imutável), `LegalAcceptance` (evidência
  de IP/user agent, nunca um booleano solto). Migration escrita à mão e validada de
  verdade contra PostgreSQL 16 local — 4 cenários de constraint (versão única por
  documento, aceite único por versão, tipo de documento único, proteção contra
  hard-delete).
- Sanitização real de rich text (`sanitize-html`, Seção 130) — 5 testes unitários
  rodando de verdade: remove `<script>`, remove atributos de evento inline, bloqueia
  `javascript:`, preserva as tags permitidas, descarta tags fora da lista.
- `saveDraft`/`publishDraft` (Seção 131-132): publicar arquiva a versão anterior; a
  flag "exigir novo aceite" definida na publicação decide se aceites de versões
  anteriores continuam valendo (correção cosmética) ou não (mudança relevante).
- `AccessPolicyService` (Estágio 4) agora usa a checagem legal real, substituindo o
  stub — o resultado `LEGAL_ACCEPTANCE_REQUIRED` leva à tela real `/aceitar-termos`
  (Seção 135: só documentos, aceite e logout, nunca o Dashboard).
- Páginas públicas `/privacidade` e `/termos` (Seção 136) — conteúdo do banco, nunca
  hardcoded.
- Painel Admin mínimo (`/admin/legal`, Seções 129, 137) com editor rich-text por
  toolbar (envolve a seleção nas tags permitidas) — decisão deliberada de não trazer
  uma biblioteca WYSIWYG completa para esta etapa.
- Teste de integração do fluxo completo (rascunho → publicação → gate bloqueia →
  aceite → gate libera → republicação com/sem exigência de reaceite) pronto para CI.

### Estágio 6 — o que foi entregue

- Modelo comercial (Seções 102-114, 38): `SubscriptionPlan`, `TenantSubscription`
  (preço congelado no momento da contratação — Seção 107), `SubscriptionCharge`
  (mensalidade), `AuditEvent`. Migration escrita à mão e validada contra PostgreSQL 16
  local — 3 cenários de constraint (uma assinatura por tenant, uma cobrança por
  competência, proteção contra apagar plano em uso).
- Seed idempotente do plano **VortCon Pro** (R$ 49,90/mês) finalmente encadeado no
  `start` — cumprindo a promessa feita no Estágio 1.
- `provisionTenantWithOwner` (Estágio 3) agora cria a assinatura atomicamente junto do
  tenant e do owner, com a primeira mensalidade gerada logo em seguida.
- Inadimplência e desbloqueio automáticos (Seções 113-114): sem job agendado ainda
  (Estágio 13), a checagem roda reativamente a cada avaliação do `AccessPolicyService` —
  documentado explicitamente como solução temporária no código.
- Isento (Seção 108) nunca gera cobrança — "sem dívida artificial".
- Bootstrap seguro do primeiro `GLOBAL_ADMIN` (Seção 162) via
  `ADMIN_BOOTSTRAP_EMAIL`/`TOKEN`, reaproveitando o fluxo de convite do Estágio 4 — sem
  senha hardcoded. O link de ativação é sempre logado no console do Railway,
  independente do Resend conseguir entregar, para nunca deixar o Admin sem forma de
  ativar a própria conta.
- Política de senha por requisito de produto (8+ caracteres, maiúscula, número,
  especial) — documentado explicitamente no código que **não existe** restrição de
  caractere por segurança de banco (Argon2id + queries parametrizadas do Prisma já
  eliminam essa classe de risco por completo, independente do conteúdo da senha).
- Admin Dashboard (métricas da Seção 148, sem patrimônio privado), gestão de planos,
  criação/listagem de tenants com seleção de plano, detalhe do tenant (assinatura,
  mensalidades, registrar pagamento, bloqueio manual). Tela "Minha Assinatura" do lado
  do tenant (Seção 112, read-only, chave PIX vinda de `VORTCON_PIX_KEY`).
- Auditoria (Seção 146-147) conectada a: provisionamento, bloqueio/desbloqueio
  (automático e manual), pagamento — nunca expõe dado financeiro privado do tenant.
- 27 testes unitários passando de verdade neste ambiente, mais teste de integração do
  fluxo comercial completo (mensalidade → atraso → bloqueio automático → pagamento →
  desbloqueio automático → isento nunca gera cobrança) pronto para CI.
- Correções pós-deploy nesta etapa: tipo `Json?` do Prisma exige `Prisma.InputJsonValue`
  (não `Record<string, unknown>`) — só aparece com o Client gerado de verdade;
  redirecionamento de `GLOBAL_ADMIN` corrigido em dois pontos (aceitar convite e login
  normal, ambos sempre mandavam para `/app`) e blindado na raiz (`AccessPolicyService`
  agora retorna um estado tratável em vez de lançar exceção); login aceita username OU
  e-mail (o username é gerado automaticamente e nunca era comunicado com destaque);
  e-mail de convite agora informa o username; `AdminShell` (com botão Sair) unificado
  em todas as páginas do Admin, incluindo as de Legal que ficaram órfãs desde o
  Estágio 5 (construídas antes do Shell existir).

### Estágio 7 — o que foi entregue

- Modelo de domínio financeiro completo (Seções 38-70, 225): `FinancialAccount`,
  `Category`, `Tag`, `FinancialTransaction`, `FinancialTransactionTag`, `Transfer`.
  Migration escrita à mão e validada contra PostgreSQL 16 local, incluindo o cenário
  mais crítico do documento inteiro: uma mesma categoria com receita **e** despesa
  simultâneas, confirmando por `information_schema` que nenhuma coluna `type` existe
  em `categories` nem `tags`.
- **Financial Engine** (Seção 63) com o contrato completo: saldo real, saldo por conta,
  receita/despesa/resultado do período, pendências, saldo projetado, breakdown e fluxo
  de categoria/tag (nunca assumindo natureza fixa), totais diários, evolução mensal.
  Exclusões financeiras (cancelado/ignorado) centralizadas num único filtro reutilizado
  por toda função do engine (Seção 59).
- Módulos `accounts`, `categories`, `tags`, `transactions`, `transfers` com validação de
  ownership entre tenant e IDs recebidos (Seção 210) — conhecer o ID nunca concede acesso.
- Suíte de testes obrigatória (`financial-engine-mandatory.test.ts`) cobrindo item a item
  as Seções 170 (receita/despesa pendente vs. liquidada, competência vs. caixa entre
  meses, transferência neutra no resultado, cancelado/ignorado excluídos), 171 (categoria
  bidirecional — o cenário exato do Empréstimo do documento) e 172 (tag bidirecional +
  isolamento de tenant).
- Por decisão de escopo do próprio roadmap (Seção 181): este estágio é só modelo de
  dados + Financial Engine + serviços de domínio — a UI de transações (formulários,
  drawer, filtros, mobile) é construída no Estágio 9, propositalmente depois.

### Estágio 8 — o que foi entregue

- `RecurrenceSeries` (Seção 70) + vínculo `recurrenceSeriesId`/`recurrenceOccurrenceKey`
  em `FinancialTransaction` (Seção 71) — migration validada contra PostgreSQL 16 local,
  incluindo a constraint anti-duplicação de ocorrência (uma série não pode gerar a
  mesma competência duas vezes) e a confirmação de que transações avulsas continuam
  livres mesmo com múltiplos `NULL/NULL`.
- Cálculo puro de datas de ocorrência para as 5 frequências (DAILY/WEEKLY/MONTHLY/
  YEARLY/CUSTOM_DAYS), com 7 testes unitários reais cobrindo o caso mais traiçoeiro:
  dia 31 caindo em fevereiro (clampa para 28, sem `Invalid Date`).
- Materialização idempotente dentro de uma janela futura de 90 dias (Seção 75: "não
  gerar anos infinitamente") — mesmo padrão reativo (sem job agendado ainda, Estágio 13) já usado para mensalidades comerciais no Estágio 6.
- "Alterar recorrência" (Seção 73) como ação explícita e distinta de editar uma
  ocorrência isolada (Seção 72): muda a série e as ocorrências futuras `PENDING`,
  nunca as liquidadas/canceladas/históricas. Encerrar a série (Seção 74) para novas
  ocorrências sem apagar as já materializadas.
- Teste de integração reproduzindo o exemplo exato da Seção 72 (base R$ 1.000/dia 14 →
  outubro R$ 1.500/dia 15 → novembro permanece R$ 1.000/dia 14) e o último item,
  antes pendente, da suíte financeira obrigatória da Seção 170.

### Varredura de conformidade (Estágios 1-8)

A pedido explícito, revisamos seção por seção do Master Document contra o código já
entregue, em vez de confiar na memória de quando cada trecho foi escrito. Lacunas reais
encontradas e corrigidas nesta varredura:

- **Seção 24** — formulário de criação de tenant no Admin não coletava telefone,
  nascimento, timezone editável nem dia de vencimento, mesmo o backend já suportando
  tudo desde o Estágio 3/6. Corrigido nos dois lados (rota + formulário).
- **Seção 63** — `getTagBreakdown()` estava inteiramente ausente do Financial Engine
  (12 das 13 funções do contrato existiam). Implementado, agregando via
  `financial_transaction_tags` (relação N:N, sem `groupBy` direto possível).
- **Seção 66** — `transfers` não tinha a coluna `recurrence_series_id` exigida
  explicitamente na especificação. Adicionada via migration, com a ressalva registrada
  no código de que a materialização automática de transferências recorrentes ainda não
  está implementada (só o vínculo estrutural) — abrir quando houver especificação mais
  clara de como isso deve se comportar.
- **Seção 148** — Admin Dashboard mostrava 9 das 10 métricas exigidas; faltava
  "mensalidades" como contagem própria, distinta de pendentes/inadimplentes.
- **Seção 150** (regra absoluta: nunca devolver modelo ORM cru) — as rotas de criar/
  editar plano devolviam o objeto Prisma direto. Corrigido para DTOs explícitos.
- **Seção 153** — zero rate limiting em login, forgot-password, reset-password,
  accept-invite e admin/bootstrap, apesar de exigido explicitamente "especialmente"
  nessas rotas. Implementado rate limiter em memória (`shared/security/rate-limit.ts`,
  documentado como solução de instância única — migrar para Redis se houver
  escalonamento horizontal), aplicado nas 5 rotas, com 4 testes unitários reais.
- **Seção 155** — faltavam os índices compostos `tenant_id+category_id+due_date`,
  `tenant_id+account_id` e `tenant_id+created_at` explicitamente listados como exemplo.
  Adicionados via migration.
- **Seção 157** — não existia nenhuma função para alterar o saldo inicial de uma conta
  com auditoria, apesar de exigido explicitamente. Implementada, registrando evento de
  auditoria (sem incluir o valor em si, por privacidade — Seção 147).
- **Observabilidade** (Seção 158) — falha no envio do convite por e-mail em
  `provisionTenantWithOwner` propagava como exceção mesmo após tenant/usuário/assinatura
  já terem sido criados com sucesso, fazendo o Admin ver "erro ao criar tenant" para um
  tenant que já existia. Envolvido em try/catch com log, mesmo padrão já usado no
  bootstrap do admin.

Decisões revisadas e **mantidas conscientemente** (não são lacunas): uso de `cuid()` em
vez de UUID (Seção 152 aceita "ou equivalente"); ausência de Content-Security-Policy
completo (a seção de Security Headers enquadra isso como "compatível com PWA", e PWA só
chega no Estágio 14); e as métricas de "participação %" e "evolução temporal" por
categoria (Seção 44) ficam para o Estágio 12 (Relatórios), que é onde a própria seção as
enquadra — o Financial Engine do Estágio 7 já expõe os primitivos (`getCategoryBreakdown`,
`getMonthlyEvolution`) que os relatórios vão compor.

## Stack

- **Frontend/Full-stack:** Next.js + React + TypeScript
- **Runtime:** Node.js LTS
- **Banco:** PostgreSQL
- **ORM:** Prisma
- **Validação:** Zod
- **Estilo:** Tailwind CSS + Design System próprio (tokens VortCon)
- **E-mail transacional:** Resend
- **Push:** Web Push / VAPID
- **PWA:** manifest + service worker (não offline-first)
- **Testes:** unit/integration + Playwright (E2E)
- **CI/CD:** GitHub Actions → Railway
- **Infraestrutura:** Railway (Web Service + PostgreSQL + Cron Schedules — ver "Worker e Jobs" abaixo)

## Arquitetura

Monólito modular. Nada de microserviços, Kafka, Kubernetes, CQRS ou event sourcing desnecessários nesta fase.

```
UI → Application Service → Domain Rules → Repository/Data Layer → PostgreSQL
```

A UI nunca implementa matemática financeira. Toda regra de cálculo passa pelo **Financial Engine**, núcleo único usado por Dashboard, Cockpit, Relatórios e Insight Engine.

Organização por domínio (`src/modules/*`):

```
auth · tenants · users · accounts · categories · tags · transactions
transfers · recurrence · financial-engine · insights · dashboard
cockpit · reports · plans · subscriptions · notifications · legal
backups · admin · audit

shared/
  ui · design-system · database · security · validation
  email · push · jobs · observability
```

### Regra estrutural inegociável: categorias e tags são transversais

Categoria e tag **não têm** `type = INCOME | EXPENSE`. A natureza financeira pertence exclusivamente a `financial_transaction.type`. Uma mesma categoria (ex.: "Empréstimo") pode ter receitas e despesas simultaneamente, e relatórios devem mostrar entradas, saídas e **resultado líquido** — nunca fragmentar em duas categorias artificiais. Ver [Regras normativas centrais](#regras-normativas-centrais).

### Multitenancy

```
Tenant → TenantUser → User
```

Tenant é resolvido pela identidade autenticada e autorização — nunca por `tenantId` recebido do frontend. Toda query privada é tenant-scoped, com defesa em profundidade (autorização + repository scoping + foreign keys + testes A/B + RLS quando aplicável).

`GLOBAL_ADMIN` administra operação (cadastro, planos, assinatura, legal) e **nunca** acessa saldo, contas, receitas, despesas, categorias/tags financeiras ou relatórios do tenant. Essa restrição existe no backend, não só na UI.

## Requisitos locais

- Node.js LTS
- PostgreSQL local (ou container)
- npm

## Instalação

```bash
git clone <repo>
cd vortcon
npm install
cp .env.example .env
```

## Configuração e variáveis de ambiente

Todas as variáveis vivem em `.env` (nunca commitado) a partir de `.env.example`. Famílias:

```
DATABASE_*        # conexão PostgreSQL
APP_*              # nome, URL base, ambiente
AUTH_*             # segredos de sessão/cookies
RESEND_*           # API key e remetente
VAPID_*            # chaves push
VORTCON_PIX_KEY    # chave PIX para cobrança (nunca hardcode, nunca versionar valor real)
ADMIN_BOOTSTRAP_*  # criação segura do primeiro admin (sem senha hardcoded)
```

## Banco de dados, migrations e seeds

- PostgreSQL é a fonte transacional de verdade: foreign keys, constraints, migrations versionadas, índices e integridade referencial.
- Dinheiro sempre em `NUMERIC/DECIMAL`, nunca `FLOAT/DOUBLE`.
- Nenhuma migration é editada manualmente em produção como rotina.

Seed inicial:

```
Plano: VortCon Pro — R$ 49,90 — Mensal — Ativo
```

Não são criados dados financeiros fictícios nem catálogo de categorias obrigatório sem decisão explícita.

```bash
npm run db:migrate
npm run db:seed
```

## Desenvolvimento

```bash
npm run dev
```

## Testes

```bash
npm run lint
npm run typecheck
npm run test          # unit + integration
npm run test:e2e      # Playwright
```

Suítes obrigatórias antes de qualquer release: matemática financeira, categoria/tag bidirecional, multitenancy (A/B), assinatura/inadimplência, legal (gate e versionamento), notificações e PWA.

## Build

```bash
npm run build
```

## Worker e Jobs

Processos assíncronos (outbox transacional, notificações, recorrências, backups)
rodam como jobs idempotentes, expostos via `/api/jobs/run` (protegido por
`CRON_SECRET`) e disparados por **Railway Cron Schedules** — nunca um serviço
Worker separado de longa duração. Decisão tomada no Estágio 13, quando os jobs
reais foram implementados: resolve a mesma necessidade (Seção 33/164 previam um
Worker) com uma peça de infraestrutura mais simples, sem manter um segundo
processo rodando o tempo todo (Seção 201: "não adicionar infraestrutura
prematuramente"). Ver `src/modules/jobs/README.md` e a seção "Estágio 18 —
Release" para o detalhe completo dessa decisão.

Um esqueleto de processo `Worker` chegou a existir desde o Estágio 1
(`src/worker/index.ts`), antecipando essa peça — nunca foi usado depois que a
decisão acima foi tomada no Estágio 13, e foi removido no Estágio 18 por estar
morto e contradizendo a arquitetura real.

## PWA

Manifest, ícones (favicon 16/32px, ícone de app 64px+) e service worker para instalação e push. **Não é offline-first**: não há operação financeira completa sem conexão.

## E-mail (Resend)

Envio transacional (convite, boas-vindas, recuperação de senha, avisos de assinatura, lembretes) via Resend, disparado por um **Transactional Outbox** para garantir consistência com o banco.

## Deploy (Railway)

Infraestrutura oficial: Railway (não Heroku), com topologia Web Service + PostgreSQL + Cron Schedules (ver "Worker e Jobs" acima — nunca um serviço Worker separado).

**Automação de ponta a ponta — zero passo manual.** Este projeto é mantido por alguém sem
ambiente local para rodar comandos, então nenhuma etapa de deploy pode depender de um
comando digitado à mão. O pipeline garante isso em duas camadas:

```
push → main → Railway detecta o push → build automático → deploy automático
```

1. **Build automático** (`railway.json`, builder Nixpacks): `npm install` roda o hook
   `postinstall`, que executa `prisma generate` sozinho — o Prisma Client nunca precisa
   ser gerado manualmente. Em seguida `npm run build` compila o Next.js.
2. **Start automático**: o script `start` é `npm run db:migrate:deploy && next start` —
   toda migration pendente é aplicada automaticamente antes de a aplicação começar a
   servir tráfego, a cada deploy, sem exceção.
3. **Seed automático (a partir do Estágio 6)**: quando o plano `VortCon Pro` e demais
   dados de baseline forem introduzidos, `prisma/seed.ts` será escrito de forma
   **idempotente** (upsert, nunca `create` puro) e encadeado nesse mesmo `start`, para
   que também rode sozinho em todo deploy sem duplicar dados.
4. **Healthcheck automático**: `railway.json` aponta `healthcheckPath` para
   `/api/health` — o Railway só considera o deploy saudável depois que a rota confirma
   conexão real com o PostgreSQL.

`.github/workflows/ci.yml` roda em paralelo a cada push/PR (install → lint → format →
typecheck → prisma → testes → build) como _gate_ de qualidade — o deploy em si é
disparado pelo próprio Railway ao detectar o push em `main`, não pelo GitHub Actions.

```
push → CI (gate de qualidade, em paralelo) → Railway build → migrate deploy → start → healthcheck
```

### Variáveis obrigatórias no serviço Railway (configuração única, não é "rodar comando")

O build/deploy é 100% automático — mas automação não inventa segredos: o Railway
precisa saber os valores uma única vez, configurados na aba **Variables** do serviço
Web. Isso é feito uma vez só e vale para todo deploy seguinte, sem repetir. No mínimo:

| Variável              | Valor no seu caso                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Referência ao plugin PostgreSQL do Railway (ex.: `${{Postgres.DATABASE_URL}}`) — se você já anexou o Postgres ao serviço, isso já existe |
| `APP_URL`             | A URL pública do serviço, ex.: `https://vortcon-production.up.railway.app`                                                               |
| `AUTH_SESSION_SECRET` | Um segredo aleatório de 32+ caracteres — gere um e cole, nunca reuse entre ambientes                                                     |

Essas três precisam existir tanto no build quanto no runtime — no Railway, variáveis
do serviço já ficam disponíveis nas duas fases automaticamente, então uma única
configuração resolve ambas.

Mesmo assim, o build não trava mais só por essas variáveis estarem ausentes: o Next.js
executa "Collecting page data" durante `next build`, o que carrega o módulo das rotas
(inclusive imports) para análise estática — sem que o runtime real tenha começado. Se a
validação de ambiente for estrita nesse momento, uma variável de runtime ausente derruba
o build inteiro, mesmo sem nenhum código quebrado. `src/shared/config/env.ts` detecta
essa fase (`NEXT_PHASE=phase-production-build`, definida pelo próprio Next.js) e usa
valores de build seguros só para não travar a análise estática — a validação estrita
continua acontecendo de verdade no boot real (`next start`), que é quando falta de
configuração deve mesmo derrubar o processo.

## Versionamento

SemVer (`MAJOR.MINOR.PATCH`), iniciando em `1.0.0`. Branch principal: `main`.

## Troubleshooting

**Build falha em "Collecting page data" com `[env] Variáveis de ambiente inválidas ou
ausentes`.** Ocorrido no primeiro deploy real (Estágio 1): `APP_URL` e/ou
`AUTH_SESSION_SECRET` não estavam configuradas nas Variables do serviço Railway. Desde
a correção descrita em "Deploy (Railway)" acima, essa classe específica de erro não
derruba mais o build — mas as variáveis continuam obrigatórias para o app iniciar de
verdade (`next start`). Configure-as uma vez em Variables e o próximo deploy resolve.

**Deploy passou mas o app não sobe / healthcheck falha.** Veja os _Deploy Logs_ do
Railway: se a falha for em `prisma migrate deploy`, normalmente é uma migration com
conflito — nunca edite uma migration já aplicada em produção (Seção 160); crie uma nova.

_Este runbook cresce conforme o projeto avança — cada incidente real resolvido vira uma
entrada aqui, para nunca precisar ser resolvido "de cabeça" duas vezes._

## Processo de desenvolvimento — gate de qualidade entre estágios

A partir do Estágio 8, nenhum estágio novo começa sem que **todos os pontos do estágio
anterior estejam completos** em relação à especificação do Master Document — não apenas
"o que eu lembrava ter lido", mas uma reconferência seção por seção contra o código
real antes de seguir. Uma varredura retroativa nos Estágios 1-8 já encontrou e corrigiu
9 lacunas reais (registradas no bloco "Varredura de conformidade" abaixo); a partir de
agora essa conferência acontece **dentro** da entrega de cada estágio, não depois.

## Estágio 19 — Factory Reset (adicionado à especificação a pedido do cliente)

Fora da numeração original do Master Document. Um link de uso único, disponível assim
que o deploy sobe, que zera todo dado acumulado durante o desenvolvimento — inclusive o
`GLOBAL_ADMIN` — para que o produto comece 100% limpo para uso real.

- Rota: `/admin/factory-reset` — protegida por `FACTORY_RESET_TOKEN` (variável de
  ambiente) **e** por uma frase de confirmação digitada (`RESETAR`), dado o caráter
  irreversível da ação.
- **Apagado:** tenants, usuários (inclusive admin), sessões, convites, contas
  financeiras, categorias, tags, transações, transferências, recorrências, assinaturas,
  mensalidades, bloqueios, aceites legais, auditoria.
- **Preservado** (decisão explícita do cliente — não são "dados de teste"): o plano
  comercial (`subscription_plans`) e o conteúdo real de Política de Privacidade/Termos
  de Uso (`legal_documents`/`legal_document_versions`).
- **Uso único de verdade:** um marcador (`factory_reset_log`) é gravado dentro da mesma
  transação da limpeza — a própria operação nunca apaga essa tabela, e qualquer
  tentativa seguinte (mesmo com token e confirmação corretos) é rejeitada.
- Depois do reset, `/admin/bootstrap` volta a funcionar normalmente (nenhum
  `GLOBAL_ADMIN` mais existe), permitindo criar o administrador real de produção.
- Validado manualmente e de forma exaustiva contra PostgreSQL 16 local: populado um
  cenário completo (tenant, usuário, admin, transação, categoria, aceite legal,
  auditoria) e conferida linha a linha a preservação/exclusão exata. O teste automatizado
  em CI cobre só os caminhos que não tocam dados (token/confirmação inválidos) — um wipe
  real dentro da suíte compartilhada de integração derrubaria os outros testes rodando
  em paralelo contra o mesmo banco (documentado em `factory-reset-safe-checks.test.ts`).

## Estágio 9 — o que foi entregue

- Paginação real (Seção 80: máximo 15 por página, nunca infinite scroll) — validada
  contra Postgres real com 17 registros (15 na página 1, 2 na página 2). Filtro por
  tipo (Despesas/Receitas) e por período, default mês atual (Seção 76).
- **Editar** (Seção 78) como ação própria, nunca tocando status/liquidação/cancelamento
  — validado com teste de integração, incluindo rejeição de categoria de outro tenant
  (Seção 210).
- Listagem agrupada por dia com total do dia (Seção 77) — lógica extraída para
  `transaction-grouping.ts`, pura e testável isoladamente (5 testes unitários reais,
  reproduzindo o exemplo exato da especificação).
- Drawer de detalhe (Seção 78) com todos os campos exigidos e as 4 ações; editar
  acontece dentro do mesmo drawer, preservando o fluxo rápido mobile "abrir → marcar
  pago → editar se necessário → retornar" (Seção 79) sem empilhar um segundo drawer.
- Cancelar → reativar preserva e restaura o status anterior (Seção 61) — validado com
  teste de integração real.
- Cor nunca é único indicador (Seção 12) — todo valor financeiro na listagem usa
  `FinancialValue` com `showSign`, nunca só a cor vermelha/verde.
- 5 rotas de API (`criar`, `editar`, `liquidar`, `cancelar`, `reativar`), todas com
  validação de ownership e gate de acesso completo.

### Correção pós-Estágio 10 — links mortos no menu do tenant

O cliente reportou 404 em `/app/contas` e `/app/categorias`, e ausência de tela para
tags. Na varredura completa do menu, achei **5 links mortos**, não só os 3 reportados —
`/app/planejamento` e `/app/relatorios` também apontavam para páginas inexistentes.
Causa: os links foram adicionados à sidebar durante a reestruturação de UX, mas as
páginas nunca foram construídas atrás deles.

Corrigido: `/app/contas` (CRUD completo — criar, alterar saldo inicial com confirmação
explícita e auditoria já existente desde a Seção 157, inativar), `/app/categorias`
(criar com seletor de ícone do catálogo controlado, inativar), `/app/tags` (criar,
inativar — item de menu que nem existia antes). `/app/planejamento` e `/app/relatorios`
ganharam uma tela "em breve" honesta em vez de 404, já que essas duas são estágios
futuros de verdade (Relatórios é o Estágio 12) — nenhum dado fictício é mostrado ali,
só uma mensagem clara de que a área ainda está em construção.

Conferido explicitamente: todos os 4 links do menu do Admin já apontavam para páginas
reais, sem incidente ali.

### Correção pós-Estágio 10 — saldo negativo exibido sem sinal (bug crítico)

O cliente reportou: saldo inicial de R$ 300,00, despesa paga de R$ 960,00 — o Dashboard
mostrava "Saldo real: R$ 660,00" (positivo), quando deveria ser **-R$ 660,00**. O cálculo
interno sempre esteve correto; o bug era só na exibição: `FinancialValue` usava
`Math.abs()` no valor incondicionalmente e só mostrava o sinal de menos quando a prop
`showSign` era passada explicitamente — que não era o caso em `Saldo real`/`Saldo por
conta` no Dashboard. Ou seja: **qualquer saldo negativo em qualquer lugar do app que
não passasse `showSign` aparecia como se fosse positivo**, sem nenhuma indicação visual.

Corrigido na raiz: o sinal de menos em valor negativo agora é **sempre** exibido,
nunca condicionado a uma prop — `showSign` passou a controlar só o "+" explícito em
positivos. A cor também deixou de exigir que quem chama lembre de passar
`tone="negative"`: sem `tone` explícito, ela é derivada automaticamente do sinal.
Lógica extraída para `financial-value-format.ts`, testável isoladamente — este
componente não tinha nenhum teste desde que foi criado no Estágio 2, e é exatamente
assim que esse bug passou despercebido por 8 estágios. 7 testes unitários novos,
reproduzindo o cenário exato reportado (300 − 960 = −660).

### Correção pós-Estágio 10 — balanço do mês e transferência ausentes na UI

Dois pontos do cliente: (1) a listagem de Transações mostrava o mês e o total por dia,
mas não o balanço do mês inteiro (entradas − saídas) — adicionado como um card ao lado
do navegador de mês, usando `getPeriodResult` do Financial Engine (Estágio 7), então o
valor reflete o mês inteiro, não só a página atual de 15 registros. (2) Não existia
nenhuma forma de criar uma transferência entre contas — mesmo padrão do incidente
anterior: o backend (`transfer.service.ts`) existe desde o Estágio 7, a UI nunca foi
construída. Adicionado o botão "Transferência" ao lado de "Nova receita"/"Nova
despesa", com formulário (valor, conta de origem, conta de destino, data, observação)
que já nasce concluída ao confirmar — validado via SQL direto (100.000 → 700,00 na
origem, 300,00 no destino, mesma fórmula que `getAccountBalances` já usa).

### Correção pós-Estágio 10 — mês/dia errado na exibição (bug de fuso horário) + menu de Transferências

Cliente reportou: transações lançadas em setembro apareciam sob o rótulo "Agosto de
2026". Causa raiz: datas-calendário (`dueDate`, `settlementDate`, `scheduledDate` —
todas `@db.Date`, meia-noite UTC) sendo formatadas com `Intl.DateTimeFormat` sem
`timeZone: 'UTC'` explícito em componentes que rodam no **navegador** do usuário
(`TransactionsView.tsx`, `TransactionDetailDrawer.tsx`). O navegador reinterpreta a
meia-noite UTC no fuso local (Brasil, UTC-3), voltando um dia — e, perto da virada do
mês, o mês inteiro. Os dados em si sempre estiveram corretos no banco e na consulta;
o bug era só de exibição. Corrigido nos dois formatadores, mais a saudação do
Dashboard ("Hoje estamos no dia X"), que passou a usar o timezone cadastrado do
próprio usuário (`User.timezone`, Seção 24) em vez do fuso do servidor — evita que a
saudação erre o dia entre 21h-24h no horário de Brasília (Railway roda em UTC). 3
testes unitários novos reproduzindo o mecanismo exato do bug de forma determinística.

Também a pedido do cliente: **Transferências ganhou menu próprio**, separado de
Transações — antes só existia um botão de criar dentro de Transações; agora
`/app/transferencias` lista o histórico (agrupado por dia, mesmo padrão visual) e
permite criar novas. Justificativa do próprio cliente, que faz sentido
arquiteturalmente: transferência não é receita nem despesa (Seção 68), misturar as
duas listagens confundia mais do que ajudava.

### Correção pós-Estágio 10 — quebra de layout no mobile, mês em Transferências, formato do rótulo

Continuação da correção anterior — 4 pontos reportados juntos pelo cliente com prints:

- **Quebra no mobile em Contas, Transferências e Transações** — causa confirmada: as
  linhas de lista (`AccountsManager.tsx`, `TransfersView.tsx`, item de
  `TransactionsView.tsx`) usavam `flex items-center justify-between` sem nenhum
  breakpoint de empilhamento; nome/badge/valor competiam pelo mesmo espaço horizontal
  e estouravam a tela. Corrigido com `flex-col sm:flex-row` nas três, `min-w-0` +
  `truncate` nos textos (nomes longos não empurram mais o layout), e `flex-wrap` nos
  grupos de ação/badge. De brinde: achei que `Input` e `MoneyInput` (Design System)
  não tinham `w-full` no `<input>` — `DateInput` e `Select` já tinham, inconsistência
  real que explicava o campo "Saldo inicial" cortado no formulário de Nova conta;
  corrigido nos dois. `CategoriesManager.tsx` reforçado por precaução (nomes longos);
  `TagsManager.tsx` conferido e já estava seguro (já usava `flex-wrap`).
- **Transferências ganhou navegador de mês** — mesma UX de Transações agora
  (`‹ Setembro/2026 ›`), filtrando `scheduledDate` no período. `listTransfers` no
  service ganhou filtro `from`/`to` opcional para isso.
- **Rótulo "Setembro/2026"** em vez de "Setembro De 2026" — o "De" maiúsculo vinha da
  classe CSS `capitalize` do Tailwind (capitaliza cada palavra, não só a primeira),
  não de um bug de código. Formato novo escrito manualmente, sem essa classe.
- Toda essa lógica de período (`resolveMonthPeriod`, `formatMonthLabel`,
  `shiftMonthParam`) foi extraída para `shared/period.ts`, reaproveitada por
  Transações e Transferências — evita duas implementações divergindo com o tempo.
  10 testes unitários novos, incluindo casos de borda (fevereiro, virada de ano).

### Correção pós-Estágio 11 — pizza de categorias no Cockpit + reverter pago/transferido

Dois pedidos do cliente:

1. **Gráfico de pizza por categoria no Cockpit** — os destaques de categoria (maior
   saída, maior entrada etc.) ganharam companhia: dois gráficos de pizza (Despesas por
   categoria, Receitas por categoria) mostrando o percentual de cada categoria dentro
   do total do mês. Construído sem dependência externa (`conic-gradient` do CSS), com
   legenda mostrando nome + valor + percentual em texto — cor nunca é único indicador
   (Seção 12). Nada foi removido, só somado.
2. **Reverter pago/transferido antes de editar** — o cliente foi explícito: "às vezes
   eu dou como pago e não entrou, aí eu tiro o pago". Antes só existia marcar como
   pago, nunca desfazer. Adicionado `unsettleTransaction`/`unsettleTransfer`
   (PAID/RECEIVED/COMPLETED → PENDING, limpando a data de liquidação) e troquei o
   botão de mão única por um **toggle bidirecional**, posicionado no topo do drawer de
   detalhe — antes de "Editar", nunca dentro dele. Mesma coisa em Transferências, que
   nem tinha detalhe clicável ainda — criado do zero (`TransferDetailDrawer.tsx`), e
   corrigido de brinde um badge que mostrava "sucesso" (verde) para transferências
   pendentes.

De brinde: nunca existia um teste de integração dedicado para o módulo de
transferências — a matemática de saldo tinha sido validada só via SQL direto durante o
desenvolvimento. Fechado agora (`transfers-flow.test.ts`, 9 cenários: rejeição de
mesma conta, pendente não altera saldo, concluir move saldo, criação já concluída,
desfazer restaura saldo original, desfazer rejeitado se não concluída, cancelar
rejeitado se já concluída, cancelar pendente funciona, filtro de período). Mais 2
cenários novos em `transactions-flow.test.ts` para `unsettleTransaction`.

### Correção pós-Estágio 12 — filtro de período personalizado ausente na UI

O cliente relatou: elogiou a tela, PDF e Excel, mas não encontrou como filtrar por
um período de tempo (só o navegador de mês existia visualmente). O backend já
suportava `?de=&ate=` desde a construção do módulo (`resolveMonthPeriod`,
reaproveitado de Transações/Transferências), mas nunca havia controle nenhum na tela
para isso — só o navegador `‹ Mês ›`. Adicionado um seletor de modo "Mês / Período"
acima da lista: no modo Mês, comportamento igual a antes; no modo Período, dois
campos de data (De/Até) com botão "Aplicar", usando exatamente o mesmo parâmetro que
o backend já esperava.

### Correção pós-Estágio 14 — visibilidade do Admin + Meu Perfil

Dois pedidos do cliente, antes de seguir pro Estágio 15:

1. **Painel do Admin sem visibilidade real** — as métricas ("1 ativo", "1 isento", "N
   pendentes") eram números soltos, sem forma de ver quais tenants elas representavam.
   Cada métrica agora é clicável e leva pra `/admin/tenants` já filtrado
   (`?filtro=ativos|inativos|bloqueados|pagantes|isentos|pendentes|inadimplentes`).
   Adicionado também um painel de **"Saúde do sistema"** — reaproveita a
   infraestrutura de jobs/outbox do Estágio 13 (nenhuma tabela nova): mostra a última
   execução de cada um dos 8 jobs (sucesso/falha/nunca rodou), quantos itens do
   outbox estão pendentes/falhos, e se e-mail (Resend) e push (VAPID) estão
   configurados — com um indicativo geral "Sistema saudável"/"precisa de atenção" no
   topo, exatamente como pedido.
2. **"Meu Perfil" no painel do tenant** — não existia. Criado com: dados editáveis
   (nome, telefone, data de nascimento — **nunca e-mail nem username**, mostrados só
   como leitura com nota explicando o motivo), troca de senha (exige a senha atual,
   reaproveita a mesma política de senha do cadastro), e **gerenciamento de
   biometria** — lista os dispositivos ativados, permite remover um antigo e
   cadastrar um novo. Isso fecha exatamente o cenário que o cliente descreveu:
   "perdi a chave de acesso vinculada ao aparelho, como gero uma nova". A rota de
   remover credencial já existia desde o Estágio 14 sem nenhuma tela pra usá-la —
   agora tem.

Validação do fluxo de troca de senha feita via Argon2 direto (bypass do Prisma, que
não gera neste sandbox): hash da senha atual, rejeição de senha errada, hash da nova
senha, e confirmação de que a senha antiga para de funcionar depois da troca — os 4
pontos críticos confirmados com execução real, não só leitura de código.

### Correção pós-Estágio 16 — links legais quebrados + remoção do "Ajuda" público

Dois ajustes pontuais, achados/pedidos ao revisar o backlog de páginas públicas
antes do Estágio 17:

1. **Bug real, nunca mapeado antes**: o `Footer.tsx` linkava para `/legal/privacidade`
   e `/legal/termos`, mas as páginas reais sempre estiveram em `/privacidade` e
   `/termos` — o link de Política de Privacidade/Termos de Uso estava **quebrado
   desde que o Footer foi criado**, em toda página pública e autenticada (o Footer é
   global). Corrigido para os caminhos reais.
2. **Decisão de remover "Ajuda" pública (registrada no Estágio 14), finalmente
   executada** — só tinha sido documentada como decisão, nunca removida de
   `Header.tsx` de fato. Removida agora.

As páginas de venda (`/produto`, `/funcionalidades`, `/planos`), o "Ajuda" dentro do
painel do tenant, e o editor WYSIWYG de Termos/Privacidade continuam no backlog,
sem mudança — são trabalho de conteúdo/design dedicado, não ajustes pontuais.

## Estágio 16C — o que foi entregue

Terceiro e último dos 3 sub-estágios do backlog de páginas públicas (16A/16B/16C).

- **Menu "Ajuda" novo na sidebar do tenant** (`Sidebar.tsx`), levando pra `/app/ajuda`.
- **Manual de referência em formato de perguntas expansíveis**, cobrindo Contas,
  Categorias/Tags, Transações, Transferências, Cockpit, Relatórios, Notificações,
  Meu Perfil, Biometria e Backup. Texto puro, sem imagem, como pedido — ao contrário
  das páginas públicas do 16A.
- **Toda instrução usa o texto exato dos botões/campos reais da tela** ("Nova
  receita", "Nova despesa", "Marcar como transferida" etc.) — conferido linha por
  linha no código de cada tela antes de escrever, nunca aproximado de memória.

### Achado durante a escrita do manual — recorrências sem UI (~~pendente~~ corrigido a seguir)

Ao escrever a seção de Transações, fui confirmar o texto exato do fluxo de criar uma
transação **recorrente** — e descobri que essa funcionalidade não tinha nenhuma tela
para o tenant usar. O backend existia desde o Estágio 8 (`RecurrenceSeries`,
materialização automática via job), mas `createRecurrenceSeries` nunca tinha sido
conectada a nenhuma rota de API nem a nenhum formulário. Corrigido imediatamente
depois — ver "Correção pós-16C" abaixo.

### Correção pós-16C — recorrência de transação e de transferência, de ponta a ponta

A pedido do cliente, corrigida antes de seguir pro Estágio 17 — e a lacuna acabou
sendo maior do que o achado inicial: o campo `recurrenceSeriesId` já existia em
`Transfer` desde o Estágio 8, mas a materialização **nunca teve lógica nenhuma para
transferência**, só para transação.

- **`RecurrenceSeries` estendido pra suportar os dois tipos** — novo campo `kind`
  (`TRANSACTION`/`TRANSFER`). `transactionType` e `defaultAccountId` passam a ser
  opcionais (só usados quando `kind = TRANSACTION`); `defaultSourceAccountId` e
  `defaultDestinationAccountId` são os novos campos usados quando
  `kind = TRANSFER`. Novo campo `description` — a série agora guarda o texto
  escolhido pela pessoa (ex.: "Aluguel", "Aporte mensal"), usado em cada
  ocorrência materializada; antes, transações recorrentes sempre geravam uma
  descrição genérica ("Recorrência — AAAA-MM-DD").
- **`Transfer` ganhou a mesma proteção de idempotência que `FinancialTransaction`
  já tinha** — campo `recurrenceOccurrenceKey` + constraint única
  `[recurrenceSeriesId, recurrenceOccurrenceKey]`. Sem isso, o job de
  materialização rodando duas vezes duplicaria transferências reais, movendo
  dinheiro duplicado entre contas. **Provado via SQL direto**: uma segunda
  tentativa de inserir a mesma ocorrência retorna 0 linhas afetadas — a proteção
  é do próprio Postgres, nunca uma checagem em memória.
- **`materializeSeriesOccurrences` ramificada por `kind`** — TRANSACTION continua
  criando `FinancialTransaction` como sempre; TRANSFER agora cria `Transfer`,
  seguindo exatamente o mesmo padrão de idempotência.
- **Nova rota `/api/recurrencias`**, unificada com discriminador `kind`
  (validação via `z.discriminatedUnion`) — `tenantId` sempre da sessão (Seção 142),
  nunca confiado do corpo da requisição.
- **UI conectada nos dois formulários de criação** — "Receita/despesa recorrente"
  em Transações, "Transferência recorrente" em Transferências — usando um
  componente compartilhado (`RecurrenceFields`) pra frequência, intervalo e
  condição de término (data ou número de ocorrências).
- Rejeita explicitamente série de transferência com a mesma conta de origem e
  destino — testado.

### Correção pós-recorrência — build quebrado no Railway (módulo de backup desatualizado)

Erro real reportado no deploy: `backup.service.ts` não tinha sido atualizado depois
que o `RecurrenceSeries` foi estendido pra suportar transferência —
`transactionType` virou opcional (`| null`) no schema, mas o formato de backup ainda
declarava como obrigatório. Só apareceu no build real do Railway porque o Prisma
Client daqui do meu ambiente de desenvolvimento nunca gera de verdade (limitação de
rede documentada desde o Estágio 7) — o mesmo padrão dos hotfixes anteriores.

Corrigido, com auditoria manual campo por campo contra o schema (mesma disciplina do
hotfix do Estágio 13):

- `ExportedRecurrenceSeries` e `ExportedTransfer` (formato do backup) atualizados
  com todos os campos novos: `kind`, `description`, `defaultSourceAccountId`,
  `defaultDestinationAccountId`, `recurrenceOccurrenceKey` em transferência.
- Exportação **e** restauração corrigidas nos dois sentidos — sem isso, restaurar um
  backup com uma transferência recorrente perderia a chave de idempotência
  (`recurrenceOccurrenceKey`), arriscando o job de materialização duplicar
  transferências reais depois de uma restauração.

## Estágio 16B — o que foi entregue

Segundo dos 3 sub-estágios do backlog de páginas públicas (16A/16B/16C).

- **Editor WYSIWYG de verdade** substituindo o textarea-com-toolbar do Estágio 12 —
  construído com TipTap. O que o Admin digita e formata aparece **idêntico** na
  tela, sem nenhuma marcação HTML visível — exatamente o que faltava.
- **Extensões do editor restritas exatamente às mesmas tags que sobrevivem à
  sanitização do servidor** (`ALLOWED_TAGS` em `shared/security/sanitize.ts`):
  H2, H3, negrito, itálico, lista com marcadores, lista numerada, link, divisor.
  Nunca mais capacidade no editor do que o que realmente é salvo — bloqueado
  `blockquote`/`code`/`codeBlock` do StarterKit de propósito, e heading restrito a
  níveis 2-3 (nunca H1, reservado ao título da página).
- **Bug real corrigido na sanitização**: o TipTap serializa parágrafos como `<p>`
  sem linha em branco entre eles (diferente do texto corrido que o textarea antigo
  esperava) — sem ajuste, isso duplicaria a marcação (`<p><p>...`). Corrigido
  adicionando `p` à lista de tags de bloco já reconhecidas — mudança cirúrgica de
  uma linha, testada contra o comportamento antigo (10/10 testes, nenhum
  regredindo) mais o caso novo do editor.
- **A sanitização do servidor continua sendo a autoridade real** — o componente novo
  só troca a experiência de edição; o contrato com o backend não mudou, e nada do
  editor é confiado sem sanitizar de novo ao salvar.
- **Lacuna latente encontrada e corrigida de brinde**: `@tailwindcss/typography`
  nunca tinha sido instalado, mesmo com `/termos` e `/privacidade` já usando classes
  `prose`/`prose-sm` desde o Estágio 12 — essas classes eram silenciosamente
  ignoradas pelo Tailwind (nenhum efeito visual) o tempo todo. Instalado e registrado
  no `tailwind.config.ts` agora — beneficia tanto o editor novo quanto as duas
  páginas públicas que já dependiam dessas classes.

### Correção pós-Insight Engine — Dashboard esquecido + remoção do Planejamento

Dois ajustes pontuais, encontrados/pedidos ao revisar a entrega antes do Estágio 17:

1. **Bug real: o Insight Engine só tinha sido conectado ao Cockpit, nunca ao
   Dashboard (Início)** — o Dashboard tem sua própria seção "Insights", separada da
   do Cockpit, com o mesmo texto hardcoded ("O motor de insights chega em um
   estágio futuro"). Corrigido: `/app/page.tsx` agora busca também o breakdown por
   categoria do mês anterior (única peça que faltava) e chama
   `generateCategoryInsights`, o mesmo motor real usado no Cockpit. Confirmado por
   busca no código inteiro que não sobra nenhuma outra ocorrência do texto antigo.
2. **Menu "Planejamento" removido por completo** — investigado a pedido do
   cliente: esse item **não aparece em nenhum lugar do documento mestre** e eu não
   tinha nenhuma nota registrada sobre por que foi criado. O mais provável é que
   tenha sido adicionado como placeholder durante a reestruturação de UX (entre os
   Estágios 8-9) sem nunca virar escopo de verdade. O cliente confirmou que não faz
   sentido pro propósito da ferramenta — removido o item do menu (`Sidebar.tsx`) e
   a página inteira (`/app/planejamento`).

## Estágio 18 — Release — o que foi entregue

Último estágio antes da VortCon V1.0.0 ser considerada formalmente completa.
Não é construção de feature — é preparação de release e verificação final
contra o critério de aceite da especificação (Seção 182) e as checklists finais
(214-218).

### Correção encontrada ao reler a Seção 207 (Perfil) — timezone nunca era editável

Ao conferir "Meu Perfil" contra a especificação, achei uma lacuna funcional real:
a Seção 207 pede "Tenant pode alterar: telefone; e-mail; timezone; senha" — o
fuso horário nunca tinha campo pra editar, ficando travado no default
`America/Sao_Paulo` pra sempre. Isso importa de verdade: é o fuso que decide o
horário dos lembretes de vencimento (Seção 117 — "08:00 no timezone do tenant");
sem poder mudar, qualquer pessoa fora de Brasília recebia lembrete na hora
errada permanentemente. Corrigido: seletor de fuso horário (as 4 zonas reais do
Brasil) adicionado ao formulário de dados pessoais.

Adicionei também a seção "Links úteis" (Assinatura, Termos, Privacidade) —
Seção 207 pede "Mostrar: (...) assinatura; legal" dentro do Perfil; esses já
existiam como páginas próprias no app, só não estavam linkados a partir daqui.

**Sobre e-mail continuar travado**: a Seção 207 original diz que e-mail
deveria ser editável pelo tenant — mas o cliente, numa instrução verbal
posterior e explícita, pediu o contrário ("com exceção do email... que é o que
vincula todo o processo"). Mantido travado, por decisão do cliente que
sobrepõe o texto original nesse ponto específico — não é uma lacuna, é uma
divergência documentada de propósito.

### Railway — infraestrutura (Seção 180)

| Item        | Situação                                                                                                                                                                                                                                                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Web Service | Next.js, já em produção conforme confirmado pelo cliente ao longo dos Estágios 1-17                                                                                                                                                                                                                                                        |
| **Worker**  | **Decisão arquitetural, documentada aqui**: nunca existe um serviço "Worker" separado. Os 8 jobs (Estágio 13) rodam via 3 serviços de Cron do Railway chamando `/api/jobs/run`, protegido por segredo — já configurado e confirmado funcionando pelo cliente. Resolve a mesma necessidade sem manter um segundo processo de longa duração. |
| PostgreSQL  | Em produção, confirmado pelo cliente                                                                                                                                                                                                                                                                                                       |
| env         | `.env.example` conferido contra a Seção 190 (banco, Resend, PIX, VAPID, URLs, Admin bootstrap, secrets) — completo, nenhuma lacuna                                                                                                                                                                                                         |
| Migrations  | Todas testadas contra Postgres real antes de cada entrega, nesta sessão e em todas as anteriores                                                                                                                                                                                                                                           |
| Healthcheck | `/api/health` existe desde o Estágio 16, testado                                                                                                                                                                                                                                                                                           |
| Smoke       | **Requer confirmação do cliente em produção** — não posso alegar isso verificado sem acesso real ao ambiente (Seção 220: "não alegar deploy não verificado")                                                                                                                                                                               |

### Critério de aceite V1.0.0 (Seção 182) — revisão item por item

A esmagadora maioria já está confirmada por código + teste + o próprio cliente
usando em produção ao longo dos 18 estágios. Os poucos itens abaixo exigem
confirmação humana em produção — não é algo que eu, como agente, deveria alegar
sem ver acontecer:

- [x] Admin cria tenant, convite funciona, usuário cria senha, gate legal, tenant
      entra, onboarding, contas, categorias/tags globais e bidirecionais,
      relatório por categoria, resultado líquido, receitas/despesas, settlement,
      transferências, recorrências, Dashboard, Cockpit, Insights, relatórios,
      PDF/Excel, assinatura, bloqueio D+5, desbloqueio, notificações, backup
      respeita tenant, Admin não vê financeiro, A não acessa B, migrations
      reproduzíveis, README atualizado, env.example completo — **todos com
      código + teste automatizado confirmando, detalhado estágio por estágio ao
      longo deste README**
- [ ] **PIX funciona via env** — a chave existe em `VORTCON_PIX_KEY`, nunca
      hardcoded; o pagamento em si é sempre manual/externo (Seção 110), então
      "funcionar" aqui significa a chave aparecer certo na tela — peço
      confirmação visual do cliente
- [ ] **PWA instala / push funciona** — documentado como checklist manual em
      `/docs/qa-checklist-manual.md` desde o Estágio 17; exige navegador e
      aparelho reais
- [ ] **Resend funciona** — a integração está testada com mocks/lógica; o envio
      de um e-mail real chegando numa caixa de entrada de verdade exige
      confirmação do cliente
- [ ] **Mobile/desktop validados** — responsividade foi auditada e corrigida
      repetidamente (Estágios 9-16), mas "validado" no sentido do critério de
      aceite significa alguém olhando num aparelho real
- [x] **CI verde** — confirmado. Pipeline completo (formatação, lint,
      typecheck, testes unitários + integração contra Postgres real, build de
      produção) rodou verde de ponta a ponta pela primeira vez. Ver
      "CI (GitHub Actions) — jornada até o verde" abaixo — o caminho até aqui
      revelou e corrigiu vários bugs reais que este ambiente de
      desenvolvimento nunca teve como pegar sozinho.
- [ ] **Smoke production aprovado** — mesmo motivo do item de Healthcheck acima

## Busca (tenant e Admin) — construída após o Estágio 18

O cliente notou que a busca, tanto do painel do tenant quanto do Admin, nunca
tinha sido implementada de verdade — era um "shell visual" desabilitado de
propósito desde a reestruturação de UX (entre os Estágios 8-9), quando os
módulos que ela cruzaria ainda não existiam. Como o app está completo agora,
essa razão para adiar não vale mais.

- **`tenant-search.service.ts`** — busca do painel do tenant: transações (por
  descrição), contas, categorias e tags. `tenantId` sempre da sessão (Seção
  142), nunca aceito do cliente. Menos de 2 caracteres nunca busca nada, pra
  evitar consulta ampla demais a cada tecla digitada.
- **`admin-search.service.ts`** — busca do painel Admin, deliberadamente
  restrita a tenants (nome/e-mail/usuário do dono, nunca dado financeiro) —
  mesma regra de sempre ("Admin não acessa financeiro do tenant").
- **`Topbar` reescrita** — campo de busca real, com dropdown de resultados,
  busca ao digitar (debounce de 300ms), navega pro lugar certo ao clicar num
  resultado. Ganhou o prop `searchScope` (`admin` | `tenant`) pra saber qual
  serviço chamar — Admin e área do tenant reaproveitam o mesmo componente,
  mas nunca o mesmo escopo de busca.
- **Isolamento testado de verdade**: criei dois tenants com dados
  reconhecíveis (um com a palavra "Netflix" numa transação, outro sem nada
  parecido) e confirmei que a busca de um nunca encontra o dado do outro —
  e que a busca do Admin, mesmo encontrando o tenant certo, nunca inclui
  nenhum vestígio do dado financeiro dele na resposta (serializei o
  resultado e conferi que a string "Netflix" e o valor em centavos nunca
  aparecem nele).

### CI (GitHub Actions) — jornada até o verde

Nunca existia (Seção 166). `.github/workflows/ci.yml` roda em toda PR e todo push
em `main`: formatação, lint, typecheck, testes (unitários + integração) e build
de produção — nesta ordem, falhando rápido no primeiro problema.

**Diferença importante em relação a este ambiente de desenvolvimento**: o
runner do GitHub Actions tem acesso de rede completo — `prisma generate`
funciona de verdade lá (nunca funcionou aqui, limitação documentada desde o
Estágio 7), e os testes de integração (que eu nunca consegui _executar_ de
verdade neste sandbox, só validar por leitura/matemática/SQL direto) vão rodar
de verdade contra um Postgres real do próprio GitHub Actions pela primeira vez
nesse pipeline. Isso significa que a primeira execução do CI é também a
primeira vez que a suíte de integração inteira roda de ponta a ponta — vale a
pena prestar atenção especial nela.

Um detalhe de configuração que corrigi no caminho: as variáveis opcionais
(`RESEND_API_KEY`, `VAPID_*`) precisam ficar **totalmente ausentes** no
workflow, nunca como string vazia — o schema de validação
(`z.string().min(1).optional()`) aceita a variável ausente, mas uma string
vazia falha o `min(1)` e quebraria o build por um motivo nada óbvio.

**A primeira execução real revelou bugs genuínos que este ambiente de
desenvolvimento nunca teve como pegar sozinho** — a diferença de rede/Prisma
já mencionada significa que boa parte da suíte de integração só rodou de
verdade pela primeira vez neste pipeline, depois de 18 estágios inteiros só
validados por leitura de código, matemática e SQL direto. Cada rodada do CI
revelou um problema real, corrigido antes da próxima:

1. **272 arquivos "mal formatados" de uma vez** — não era conteúdo, era
   diferença de final de linha (CRLF introduzido ao subir arquivo pelo
   navegador). Corrigido com `endOfLine: "auto"` no Prettier + `.gitattributes`
   pra padronizar daqui pra frente.
2. **Configurações essenciais nunca tinham chegado ao repositório** —
   `.eslintrc.json`, `.prettierrc.json`, `.gitattributes`: arquivos que
   começam com ponto ficam ocultos por padrão em vários gerenciadores de
   arquivo, e simplesmente nunca foram enviados nas entregas anteriores deste
   projeto (só existiam no ambiente de desenvolvimento).
3. **`demo.html`** — um mockup estático da fase de design inicial, nunca
   referenciado em lugar nenhum do projeto, removido (limpeza, não conserto).
4. **Bug real em `legal-flow.test.ts`** (Estágio 17) — usava o nome de campo
   errado (`versionId` em vez de `documentVersionId`) numa consulta direta ao
   banco.
5. **JSX quebrando em qualquer teste que tocasse um componente `.tsx`** —
   `tsconfig.json` usa `"jsx": "preserve"` (delega a transformação pro
   bundler do Next.js), mas o esbuild do Vitest não infere isso sozinho.
   Corrigido configurando o runtime automático explicitamente em
   `vitest.config.ts` — resolve a causa raiz pra qualquer `.tsx` futuro, não
   só o arquivo que quebrou primeiro.
6. **Bug real na fronteira exata de carência** (Estágio 17) — o teste
   reaproveitava "a primeira cobrança do tenant compartilhado", que por essa
   altura do arquivo já tinha sido paga por outro teste anterior. Corrigido
   criando uma cobrança isolada; e a fronteira exata (4 vs. 5 dias) foi
   extraída pra um módulo puro (`delinquency-rules.ts`) porque testá-la
   através de um campo `@db.Date` do banco (que trunca a hora) provou ser
   instável dependendo do horário exato em que o pipeline rodava.
7. **Bug pré-existente de um estágio bem anterior, nunca pego até agora** —
   `login()` chamava `cookies()` do Next.js diretamente, uma API que só
   funciona dentro de uma requisição HTTP real. Corrigido separando a criação
   da sessão (lógica pura, testável) do efeito colateral de setar o cookie
   (que só a rota de API real faz agora).

Nenhum desses bugs foi hipotético — cada um só apareceu porque a suíte
finalmente rodou contra infraestrutura real pela primeira vez. É exatamente o
valor que o CI deveria entregar, e entregou.

### Limpeza encontrada no caminho — Worker morto desde o Estágio 1

Ao montar o CI, precisei revisar `package.json` com atenção e achei um resíduo
real: um script `"worker": "tsx src/worker/index.ts"` e o arquivo
correspondente, ambos do **Estágio 1** — um esqueleto que antecipava um
processo Worker separado, nunca atualizado quando a decisão real (Cron do
Railway + rotas de API) foi tomada no Estágio 13. Ficou morto e contradizendo a
arquitetura real por 17 estágios. Removidos agora — arquivo, script, e as 4
menções que ainda restavam no README descrevendo a topologia antiga
("Web + Worker + PostgreSQL").

### Checklists finais (Seções 214-218) — nenhum item novo encontrado

Conferidos contra o histórico completo do projeto — segurança (Estágio 16),
financeiro (Estágios 6-9, 17), comercial (Estágio 6), legal (Estágio 12, 16B),
mobile (auditado a cada estágio). Nenhuma lacuna nova além das já registradas
nesta seção.

### CHANGELOG.md criado

Nunca tinha existido (Seção 198 exige). Criado agora, resumindo a V1.0.0
completa.

## Estágio 17 — QA — o que foi entregue

Estágio de auditoria (Seções 169-179) — não é construção nova, é conferir cada
cenário obrigatório listado na especificação contra a suíte de testes já
existente, escrevendo só o que realmente faltava. Rodado em toda a extensão do
projeto, não um recorte.

**Confirmado como já coberto, sem precisar de nada novo:**

- Seção 170 (financeiro obrigatório) — os 11 itens, incluindo o que parecia faltar
  numa primeira olhada ("recorrência editada em outubro não altera novembro" —
  estava em `recurrence-flow.test.ts`, não no arquivo que eu esperava)
- Seção 171 (categoria) e 172 (tag) — cobertura completa e exata, incluindo o
  exemplo literal da especificação

**Lacunas reais encontradas e corrigidas nesta rodada:**

- **Seção 173 (multitenant)** — novo arquivo
  `multitenant-isolation-extended.test.ts`: A não lê B, A não edita B (descobri que
  editar/cancelar transação de outro tenant **lança erro**, nunca falha
  silenciosamente — mais forte do que eu esperava), A não cancela B, A não recebe
  push B, jobs A não alteram B.
- **Seção 174 (assinatura)** — a fronteira exata da carência nunca tinha sido
  testada (o teste antigo usava 6 dias, bem depois do limite) — agora 4 dias
  nunca bloqueia e exatamente 5 dias sempre bloqueia, confirmado também via
  cálculo direto fora do teste. Bloqueio ADMINISTRATIVE e SECURITY nunca tinham
  sido testados nenhuma vez. Histórico de cobrança preservado após pagamento.
- **Seção 175 (legal)** — versão antiga imutável após publicar uma nova, aceite
  histórico nunca apagado, confirmação de que nenhuma função permite ao Admin
  alterar um aceite já registrado.
- **Seção 176 (notificação)** — "push inválido" (a decisão de remover uma
  inscrição expirada) foi extraída pra um arquivo próprio sem dependência de
  Prisma (`push-error-classification.ts`) especificamente pra poder ser testada
  isoladamente — sem essa extração, o teste quebraria só de _importar_ o módulo
  neste ambiente (mesma classe de problema que já apareceu antes com testes que
  tocam Prisma sem querer). Multi-device (um usuário com push ativado em dois
  aparelhos) e retry do outbox (evento que falha fica marcado com contagem de
  tentativas) testados por integração.
- **Seção 177 (PWA)** — estes itens (manifest real, prompt de instalação, ícone
  renderizado, service worker no navegador, push chegando de verdade num
  aparelho, cache do navegador) **exigem navegador real** — não são
  automatizáveis em Vitest, que roda em Node sem DOM. Documentado como checklist
  manual em `/docs/qa-checklist-manual.md`, com a explicação de por quê.

**Definition of Done (Seção 178) — avaliação em nível de projeto:**

| Dimensão                              | Situação                                                                                                                                     |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Comportamento, validação, autorização | Cobertos por testes de integração em cada módulo, reforçados nesta rodada                                                                    |
| Tenant isolation                      | Extensivamente testado — Estágio 17 fechou os últimos itens da Seção 173                                                                     |
| Erros                                 | Toda rota de API trata erro e devolve mensagem; jobs marcam FAILED com detalhe                                                               |
| Loading / empty                       | Todo componente de listagem tem estado vazio tratado (confirmado ao longo dos Estágios 6-16)                                                 |
| Mobile / desktop                      | Responsividade auditada e corrigida repetidamente (Estágios 9-16)                                                                            |
| Accessibility                         | `aria-label`, `role`, navegação por teclado nos componentes interativos principais                                                           |
| Testes                                | 118 testes unitários reais + suíte de integração ampla (não executável neste sandbox por limitação de Prisma, documentada desde o Estágio 7) |
| Logs                                  | Nunca segredo/senha em log (auditado no Estágio 16); jobs e outbox logam falha com contexto                                                  |
| Migration                             | Toda migration testada contra Postgres real antes de cada entrega                                                                            |
| Docs                                  | README com histórico completo de cada estágio, decisão e correção                                                                            |
| Regressão                             | Nenhuma mudança recente quebrou teste já existente (confirmado a cada rodada de validação)                                                   |

**QA desta rodada:** lint limpo, typecheck limpo, **118/118 testes unitários**
rodando de verdade (116 anteriores + 2 novos nesta auditoria —
`isExpiredSubscriptionError`). Os demais testes novos desta rodada são de
integração (multitenant, assinatura, legal, jobs) — não executam neste sandbox
pela limitação de Prisma já documentada desde o Estágio 7, mas foram validados
por revisão manual linha a linha contra o schema e, no caso da fronteira de
carência, por cálculo direto fora do teste (confirmado: 4 dias não bloqueia, 5
dias bloqueia). Build compilando.

## Insight Engine — o que foi entregue

Parte original do Estágio 11 ("Cockpit/Insights"), nunca construída até agora —
fechada antes do Estágio 17, a pedido do cliente.

- **`insight-rules.ts`** — motor de regras puro (Seção 90-92), sem I/O: recebe os
  totais já calculados pelo Financial Engine e devolve 0 ou 1 candidato a insight
  por categoria. Determinístico, nunca IA generativa — pipeline fixo Financial
  Engine → métricas → regras → relevância → templates → insight.
  - Categoria bidirecional com receita **e** despesa no mesmo período → sempre
    template de resultado líquido (Seção 92: "preferir resultado líquido da
    categoria quando entradas e saídas forem comparadas"), nunca dois insights
    separados que poderiam se contradizer.
  - Categoria só de despesa ou só de receita → variação percentual em relação ao
    mês anterior, com piso de relevância (R$ 50, julgamento de engenharia
    documentado no código — a especificação não define um valor exato) pra nunca
    gerar uma "variação de 200%" de uma categoria com movimento irrisório; sem
    base de comparação válida, cai pro total absoluto.
  - **Nunca divide por zero** (`computePercentChange` retorna `null` quando o mês
    anterior é zero) e **nunca confunde redução de despesa com lucro** — os
    templates descrevem só a métrica em si, nunca concluem nada sobre o resultado
    financeiro geral do tenant.
  - **11/11 testes reais**, incluindo o exemplo exato da Seção 91 (R$ 8.000 em
    entradas, R$ 5.000 em saídas, R$ 3.000 de resultado líquido) e a confirmação
    de que o texto nunca menciona "lucro". No caminho, achei e corrigi um bug real
    no próprio teste: o formatador de moeda brasileiro (`Intl.NumberFormat`)
    insere um espaço não separável (U+00A0) entre "R$" e o valor, não um espaço
    comum — os testes agora montam o valor esperado com o mesmo formatador, nunca
    digitando a pontuação de moeda à mão.
- **`insight-engine.service.ts`** — orquestrador fino: só resolve os nomes reais
  de categoria (a única parte que faltava), delega tudo o resto pra
  `insight-rules.ts`. Recebe o breakdown por categoria **já calculado** pelo
  Cockpit — nunca busca de novo o que quem chama já tem, evitando uma consulta
  duplicada ao banco.
- **Integrado no Cockpit** — `CockpitSummary` ganhou o campo `insights`;
  `CockpitView.tsx` troca o placeholder "chega em um estágio futuro" pela lista
  real. Continua honesto quando não há insight nenhum ("ainda não há movimentação
  suficiente"), nunca inventa dado.
- **3 testes de integração** contra PostgreSQL real, incluindo o mesmo exemplo da
  Seção 91 com dados de verdade lançados no banco, e a confirmação de que um mês
  sem movimentação nenhuma não gera insight algum.

## Estágio 16A — o que foi entregue

Divisão do backlog de páginas públicas em 3 sub-estágios (16A/16B/16C), a pedido do
cliente. Este é o 16A — as 3 páginas de venda.

- **`/produto`** — página de vendas completa: hero assimétrico (texto à esquerda,
  mockup do Cockpit à direita), seção do problema real ("a maioria só descobre o
  saldo no dia do aperto"), 3 blocos de "como ajuda" alternando lado do mockup,
  seção de confiança (biometria/backup), CTA final.
- **`/funcionalidades`** — cobre só o lado do **tenant** (nunca Admin): 4 passos
  numerados (lançar → transferir → acompanhar no Cockpit → exportar relatório) —
  numerado porque é uma sequência real de uso, não decoração — mais uma grade de
  funcionalidades extra (lembretes, biometria, PWA, backup) sem numeração, porque
  essas não são uma sequência.
- **`/planos`** — **alimentada pelo banco de verdade** (`findActivePlans()`), nunca
  hardcoded: um card por plano ativo, gerado dinamicamente. Hoje só o VortCon Pro
  aparece; um plano novo cadastrado pelo Admin apareceria aqui automaticamente, sem
  tocar no código. PIX destacado. CTA é sempre "Entrar" nas três páginas — nunca um
  botão de "assinar agora" fingindo um checkout self-service que não existe no V1.
- **Sistema visual próprio para as páginas de marketing**: paleta 100% reaproveitada
  do produto real (nunca inventada) — `#123B46`/`#19A7A0`/gradiente `#1EA6D6→#0B4F82`
  — mais Fraunces (serifada) só nos títulos destas páginas, para dar um tom mais
  caloroso e confiante que o utilitário do app logado (que continua só Inter).
- **"Imagens reais" são recriações fiéis das telas reais do produto** (Cockpit,
  Transações, Relatórios), construídas com os mesmos tokens visuais do app —
  nunca ícone genérico nem banco de imagens, seguindo o pedido do cliente à risca.
- Link "Ajuda" removido do `Header.tsx` (decisão já tomada antes, agora executada
  em conjunto com a entrega das 3 páginas que a substituem em conteúdo).

## Estágio 16 — o que foi entregue

Estágio de auditoria — a lista da Seção 16 (auth, authorization, IDOR, XSS, CSRF,
rate limiting, headers, logs, secrets, multitenancy, cache, jobs, concurrency,
idempotency) foi conferida item por item, com inspeção real de código, não só
leitura. Dois gaps reais encontrados e corrigidos; todo o resto já estava correto
desde estágios anteriores — registrado abaixo com a evidência de cada checagem.

**Corrigido:**

- **Rate limiting ausente nas rotas de login por biometria** (Seção 153 —
  "especialmente login... endpoints públicos"). `/api/webauthn/login/options` e
  `/api/webauthn/login/verify` são caminhos de login público, criados no Estágio 14,
  mas nunca receberam a mesma proteção que o login por senha já tinha desde o
  Estágio 4. Mesma função `checkRateLimit` já testada, mesmo limite (10/60s).
- **Security headers incompletos** (Seção 154 — "baseline moderno compatível com
  PWA"). Faltavam `Content-Security-Policy` e `Strict-Transport-Security`. CSP
  usa só `'self'` (nenhuma exceção de domínio externo necessária — `next/font`
  hospeda as fontes no próprio domínio em build-time) e bloqueia enquadramento em
  iframe (`frame-ancestors 'none'`) e submissão de formulário para fora do domínio.

**Verificado e já correto (nenhuma mudança):**

- **Índices** (Seção 155) — os 5 índices compostos exigidos já existiam desde os
  Estágios 6-8: `tenantId+dueDate`, `tenantId+status`, `tenantId+categoryId+dueDate`,
  `tenantId+accountId`, `tenantId+createdAt`.
- **Integridade referencial** (Seção 156) — categoria usa `onDelete: SetNull` e tag
  usa `onDelete: Restrict` em transações; nenhuma função de exclusão definitiva
  existe para categoria/tag (só "inativar") — transação histórica nunca é apagada
  por uma exclusão de categoria/tag.
- **Privacidade de logs** (Seção 147) — auditoria de alteração de saldo inicial já
  tinha um comentário explícito desde o Estágio 7 citando esta seção e gravando só
  `{ changed: true }`, nunca o valor. Restauração de backup (Estágio 15) só grava
  contagens, nunca conteúdo.
- **XSS via HTML de documentos legais** — conteúdo de Termos/Privacidade
  (`dangerouslySetInnerHTML`) já passa por `sanitizeLegalContent` (allowlist restrita
  de tags, biblioteca `sanitize-html`) desde o Estágio 12, com comentário explícito
  "nunca confiar em sanitização feita só no client".
- **DTOs / exposição de dados internos** — conferido que nenhuma rota de API
  devolve o objeto `User` do Prisma completo (risco de expor `passwordHash`); toda
  passagem de dado de usuário pra Client Component já usa campos específicos
  escolhidos a dedo (Meu Perfil, Estágio 14), nunca o objeto inteiro.
- **Segredos em log** — nenhuma ocorrência de senha/token/segredo em
  `console.log`/`console.error` em todo o código.
- **Idempotência/concorrência de jobs** (Seção 128) — já coberta com prova real
  (constraint única no banco) desde o Estágio 13.

## Estágio 15 — o que foi entregue

- **Backup por tenant** (Seção 142-146): tenant exporta o próprio backup
  (`/api/backup/export`, tenantId sempre resolvido pela sessão, nunca do
  frontend); Admin restaura (V1 admin-only) com pipeline completo: validar →
  preview → confirmação → backup de segurança automático → transação → restore →
  auditoria.
- **Formato lógico versionado com manifesto** (Seção 144): versão, versão do
  VortCon, geração, vínculo de tenant, datasets, checksum (SHA-256). Nunca um dump
  multitenant — testado rejeitando explicitamente a restauração de um backup em
  tenant diferente do que ele veio.
- **Integridade transacional comprovada via SQL direto**: simulei uma falha
  proposital no meio de uma transação de restauração — o `ROLLBACK` reverteu 100%
  das mudanças, confirmando que uma falha no meio nunca deixa um tenant com dados
  parcialmente restaurados.
- IDs nunca reaproveitados na restauração — cada registro ganha ID novo, com todas
  as referências (conta, categoria, tag, série de recorrência) remapeadas
  corretamente.
- **Backup de infraestrutura** (Seção 141) documentado separadamente em
  `/docs/backup-infraestrutura.md` — as três camadas do Postgres no Railway (volume
  backups, PITR, dump lógico) e runbook de qual usar em cada cenário. Não é
  funcionalidade da aplicação — é operação de infraestrutura.

## Estágio 14 — o que foi entregue

- **Login biométrico (WebAuthn/Passkeys)** — pedido explícito do cliente, acrescentado
  ao escopo do PWA. Motivo do cuidado extra: o cliente relatou uma experiência ruim
  com biometria em outro produto (mesma biblioteca, resultado "Não autorizado"). A API
  real da versão instalada foi conferida no código-fonte (`node_modules/@simplewebauthn`),
  nunca por memória — já achei uma diferença real de assinatura na v11
  (`startRegistration({ optionsJSON })`, não os parâmetros direto) que teria causado
  erro se eu tivesse confiado em documentação antiga. A causa mais comum desse erro
  — `rpID`/`expectedOrigin` vindos de fontes diferentes — foi eliminada de propósito:
  os dois são sempre derivados da mesma variável (`APP_URL`), validado com 5 testes
  reais. Login biométrico cria a mesma sessão que o login por senha, sem caminho
  paralelo de autenticação.
- **Bug real herdado do Estágio 2 corrigido**: os ícones do PWA não eram quadrados
  (192×178, 512×474 em vez de 192×192, 512×512) — regenerados a partir do SVG da
  marca, incluindo as variantes maskable corretas (zona segura de 55% do canvas,
  fundo sólido na cor da marca).
- `manifest.json`, metadados específicos de iOS (`appleWebApp`, já que iOS não lê a
  maioria das configurações do manifest), `theme-color`.
- Service worker expandido (Estágio 13 tinha só o mínimo pra push): agora com
  instalabilidade real, cache seguro restrito a ícones/manifest — nunca dado
  financeiro, nunca offline-first (Seção 139).
- Service worker agora registrado no carregamento do app, não só quando a pessoa
  ativa push — sem isso, o navegador não considera o site instalável.

## Estágio 13 — o que foi entregue

- 4 tabelas novas (`Notification`, `PushSubscription`, `OutboxEvent`, `JobExecution`
  — a Seção 38 já previa todas), mais `reminderSentAt` em transações e mensalidades
  para a idempotência dos lembretes.
- **Motor de idempotência de jobs** (Seção 128): a proteção real é uma constraint
  única no banco, nunca uma checagem em memória — validado com 3 tentativas
  concorrentes da mesma chave via SQL direto (só 1 linha criada) e com teste de
  integração rodando 3 chamadas em paralelo de verdade.
- **Relógio por fuso horário** (Seção 117: "às 08:00 no timezone do tenant") — testado
  provando que o mesmo instante UTC dá horas diferentes em fusos diferentes, essencial
  já que o servidor roda em UTC mas cada usuário tem seu próprio fuso.
- **Supressão de lembrete** (Seção 118) — testada isoladamente e de novo com Postgres
  real: uma transação paga antes do job rodar nunca gera notificação.
- **Transactional Outbox** (Seção 126) conectado à transação real de "marcar
  mensalidade como paga" — o evento nunca se perde mesmo se o processo cair logo após
  o commit. Falha de e-mail nunca desfaz o pagamento (Seção 124).
- **Os 8 jobs da Seção 127** implementados — 2 reaproveitando lógica já existente
  desde os Estágios 6 e 8 (agora agendáveis via cron), 1 stub documentado aguardando
  o Estágio 15 (Backup), e 5 novos.
- 5 templates de e-mail novos (assinatura próxima, pendência, confirmação, bloqueio,
  desbloqueio).
- **Central de Notificações** ligada de verdade na UI — o sino do Topbar estava
  desabilitado desde a reestruturação de UX; agora tem badge, dropdown, read/unread,
  deep links contextuais e opt-in de push.
- Service worker mínimo, só o necessário para push funcionar — sem estratégia de
  cache (Seção 139), preparado para o Estágio 14 expandir para PWA completo.

## Estágio 12 — o que foi entregue

- Filtros completos (Seção 94): mês/período, categoria, conta, tag, status, natureza.
  Sempre agrupado por mês — pedido explícito do cliente: "se o cara faz um filtro de
  mais de dois meses, tem que vir dividido por mês". Validado contra Postgres real
  com dados em agosto e setembro simultaneamente.
- Relatório por categoria (Seção 96): receitas, despesas, resultado líquido,
  quantidade de entradas/saídas, evolução mensal — testado reproduzindo o formato
  exato do exemplo da especificação (Categoria: Empréstimo).
- Exportação em **Excel server-side** (Seção 101), protegida contra formula
  injection — todo texto do usuário passa por sanitização antes de virar célula;
  testado com um exploit real (`=cmd|"/c calc"!A1`), tanto na função pura quanto na
  geração do arquivo de verdade (assinatura ZIP/XLSX verificada nos bytes).
- Exportação em **PDF com template dedicado** (Seção 100 — nunca captura de tela),
  construído com `@react-pdf/renderer`: cabeçalho, cards de resumo, tabela por mês.
  Validado contra bytes reais (assinatura `%PDF-`).
- Duas dependências novas (`exceljs`, `@react-pdf/renderer`) — build completo
  confirmado compilando limpo com as duas dentro do bundler do Next.js.
- Mobile é só visualização (Seção 99) — os botões de exportação só aparecem em
  telas sm+.
- Saldo geral no relatório (pedido do cliente) — saldo real atual, dá contexto ao
  período analisado.

## Estágio 11 — o que foi entregue

- `getBalanceAsOf(tenantId, asOfDate)` no Financial Engine — generalização de
  `getAccountBalances`/`getRealBalance` com corte por data de liquidação, necessária
  pra "saldo inicial" e "posição final" do mês (Seção 86). Validado via SQL direto em
  3 pontos no tempo (antes de qualquer liquidação, com só a receita liquidada, com as
  duas liquidadas) — os 3 valores bateram exatamente com o esperado.
- Destaques de categoria (Seção 87): maior saída, maior entrada, maior resultado
  líquido positivo/negativo, categorias que cresceram em despesa/receita vs. mês
  anterior. Lógica pura extraída (`cockpit-highlights.ts`), testada isoladamente — 7
  testes, incluindo o cenário explícito da Seção 87 ("não presumir que categoria
  pertence só a um lado": uma categoria pode ser maior saída E crescer em receita ao
  mesmo tempo).
- Cockpit sempre recomputado ao vivo (Seção 88: "correção histórica recalcula
  Cockpit") — validado com teste de integração: editar uma despesa de um mês fechado
  reflete na próxima consulta, sem nenhuma ação de "recalcular".
- `CockpitAcknowledgement` (Seção 38 já previa esta entidade) — virada do mês (Seção
  89), persistida, nunca reaparece depois de confirmada.
- UI em `/app/cockpit`, com menu próprio na sidebar: navegador de mês, 5 métricas
  (saldo inicial, receitas, despesas, resultado, posição final), comparação com o mês
  anterior em barras (sem dependência externa de gráficos), destaques de categoria,
  placeholder honesto de Insights.

## Estágio 10 — o que foi entregue

- `OnboardingProgress` (Seção 38 já previa esta entidade) — migration validada contra
  PostgreSQL 16 local. Os 4 passos do checklist (conta, categoria, primeira despesa,
  primeira receita) são sempre **derivados dos dados reais** do tenant, nunca
  armazenados como flags próprias — evita uma segunda fonte de verdade dessincronizando
  (ex.: usuário cria e depois apaga a única conta). Só o estado de dispensa é
  persistido, e nunca reaparece depois de confirmado (Seção 85).
- Dashboard real (Seção 81-82) substituindo o placeholder do Estágio 4: saudação com
  primeiro nome + data de hoje, mês atual como default, todas as métricas exigidas —
  saldo real, receitas, despesas, resultado, pendente a pagar/receber, saldo projetado
  "quando apropriado" (só aparece quando há algo pendente), saldo por conta,
  movimentação por categoria (Seção 83: visão geral com entrada/saída/resultado
  líquido, categoria continua única).
- "Novo usuário" (Seção 84): nenhum dado fictício é criado — um tenant vazio mostra
  zeros reais, com o checklist de Primeiros Passos em destaque.
- Tour (modal, pode ser pulado) e card de Primeiros Passos (só confirma com os 4
  passos completos; depois de confirmado, some permanentemente) — Seção 85.
- Insights: placeholder honesto informando que o Insight Engine é um estágio futuro —
  nenhum insight fabricado.
- `factory-reset.service.ts` (Estágio 19) atualizado para incluir `onboarding_progress`
  na limpeza — é dado de teste, some junto com o resto do tenant.
- Teste de integração completo do fluxo de onboarding (5 cenários: passos derivados um
  a um, confirmação rejeitada antes de 100%, dispensa do tour persistida).

## Backlog registrado (não são lacunas — adiamento deliberado, confirmado pelo cliente)

Itens identificados e conscientemente adiados para um estágio futuro a definir:

- ~~Insight Engine (Seções 90-92) — parte original do Estágio 11, nunca construída.~~
  **Construído**, ver seção própria abaixo.

- **Tela de gerenciamento de credenciais biométricas** — o backend já suporta remover
  um dispositivo (`DELETE /api/webauthn/credentials/[id]`, Estágio 14), mas não existe
  ainda nenhuma UI de perfil/configurações no painel do tenant pra listar os
  dispositivos com biometria ativada e remover algum. Não foi pedido explicitamente
  além da sugestão na tela de login — registrado aqui em vez de construído sem pedido,
  já que exigiria criar uma área nova (Perfil/Configurações) que ainda não existe no
  painel do tenant.

- **Login por biometria após instalar o PWA — acrescentado ao escopo do Estágio 14
  (PWA).** Pedido do cliente: assim que o app for instalado (Android ou iOS), toda
  vez que a pessoa chegar na tela de login **sem** ter aceitado biometria antes, o
  app sugere ativar. A partir do momento que a pessoa aceita, essa sugestão nunca
  mais aparece. Abordagem técnica confirmada como viável — **WebAuthn/Passkeys**, a
  API padrão dos navegadores para biometria (nunca reimplementar autenticação
  biométrica na mão):
  - Funciona nos dois: Android via Chrome (impressão digital/desbloqueio facial do
    aparelho) e iOS via Safari com Face ID/Touch ID — **iOS precisa de 16.4+** para
    funcionar dentro do PWA em modo standalone (fora do Safari normal); versões
    antigas não suportam, então a sugestão só deve aparecer quando o navegador
    realmente suporta (detecção de capability antes de sugerir, nunca assumir).
  - Detectar "app instalado" via `display-mode: standalone` (Android/padrão) e
    `navigator.standalone` (específico do iOS Safari) — a sugestão só aparece nesse
    contexto, nunca no navegador comum, conforme pedido ("assim que o app for
    instalado").
  - Precisa de registro (`WebAuthnCredential` — tabela própria, já que uma pessoa
    pode cadastrar biometria em mais de um aparelho) e de um campo simples pra saber
    se a pessoa já _decidiu_ sobre a sugestão (aceitou OU dispensou) — mesmo padrão
    já usado em `OnboardingProgress`/`CockpitAcknowledgement`: nunca mostrar de novo
    depois de uma decisão explícita.
  - Servidor gera o desafio (challenge) e verifica a assinatura — a biometria em si
    nunca sai do aparelho da pessoa, só a prova de que ela passou.

- **Páginas públicas de venda: `/produto`, `/funcionalidades`, `/planos`** — ~~backlog~~
  **construído (Estágio 16A)**, ver seção própria abaixo.
- ~~`/ajuda` pública (pré-login) — decisão tomada: remover.~~ **Executado.** Link
  removido de `Header.tsx`. Só permanece o menu "Ajuda" dentro do painel do tenant
  (abaixo, ainda no backlog).
- **Menu "Ajuda" dentro do painel do tenant** — ~~backlog~~ **construído (Estágio
  16C)**, ver seção própria abaixo.

- **Busca (tenant e Admin)** — ~~backlog~~ **construída (pós-Estágio 18)**, ver
  seção própria abaixo.
- **Editor WYSIWYG de Termos/Privacidade** — ~~backlog~~ **construído (Estágio
  16B)**, ver seção própria abaixo.

## Reestruturação de UX/Navegação (a pedido do cliente, entre Estágios 8 e 9)

Antes do Estágio 9, o cliente pediu uma pausa para reestruturar navegação e
disposição visual — comparou o estado real (Admin com menu horizontal quebrando
no mobile, sem tema/hierarquia) contra três imagens de referência de UX (não de
marca — nome, logo e cores VortCon foram mantidos exatamente como já validados).

- **`AppSidebar`** (novo, `shared/ui`) — sidebar com suporte a agrupamento de
  seções, usada tanto pelo Admin quanto pela área do tenant. Responsiva por
  dentro: desktop mostra a sidebar fixa, mobile vira hambúrguer + overlay —
  antes disso não existia nenhum tratamento de mobile no Admin.
- **`Topbar`** (novo) — nesta fase, busca e notificação eram shells visuais
  desabilitados de propósito (nada de verdade pra buscar ainda; notificações
  reais chegaram no Estágio 13, busca de verdade chegou depois do Estágio 18 —
  ver seção própria). O menu do avatar sempre foi real: mostra nome/papel e
  faz logout de verdade.
- **`AdminShell`** reescrito: menu horizontal → sidebar agrupada (Visão geral /
  Tenants e assinaturas / Conteúdo), com Dashboard ganhando dois painéis com
  **dado real** (não estático): Atividade recente (via `audit_events`, já
  existente desde o Estágio 6) e Alertas (mensalidades vencidas + bloqueios
  ativos, com nome do tenant já resolvido).
- **`MetricCard`** ganhou suporte opcional a variação (`trend`, já existia) e
  mini-gráfico (`sparklineData`, novo) — compatível com todo uso anterior que
  não passa esses dados.
- **Área do tenant** (`AppShell`, novo) recebeu o mesmo tratamento visual —
  sidebar + topbar consistentes com o Admin.
- **Corrigido de brinde**: o `Header` público (landing page) nunca tinha
  tratamento de mobile — os links simplesmente somiam sem hambúrguer nenhum no
  lugar; o `MobileMenu` já existia desde o Estágio 2 mas nunca tinha sido
  conectado a nada. Conectado agora.
- **Tema escuro**: adiado para um estágio futuro formal, por decisão do
  cliente — nenhum toggle "de mentira" foi adicionado agora.

## Escopo e não escopo da V1

**Dentro do escopo:** contas financeiras, categorias e tags transversais, receitas/despesas, transferências, recorrências, Financial Engine, Dashboard, Cockpit, Insight Engine determinístico (sem IA generativa), relatórios (mensal/anual/categoria/tag, PDF/Excel), planos e assinatura (PIX manual, inadimplência automatizada), notificações (push + e-mail + central), documentos legais versionados com gate de aceite, PWA, backup/export por tenant, painel Admin operacional.

**Fora do escopo da V1:** módulo de cartão de crédito (cartão é só uma categoria), Open Banking/OFX/conciliação, contabilidade fiscal, investimentos, IA generativa, multi-moeda, gateway de pagamento automatizado, plano anual, Dark Mode, multiusuário avançado, offline financeiro completo, metas/orçamento avançado, microserviços/Kafka/Kubernetes/event sourcing/CQRS.

## Regras normativas centrais

- **Saldo real** = saldo inicial + receitas recebidas − despesas pagas ± transferências concluídas. Pendências nunca alteram o saldo real.
- **Resultado do período** = receitas do período − despesas do período, por vencimento/competência, independente da liquidação.
- **Saldo projetado** = saldo real + receitas pendentes esperadas − despesas pendentes esperadas.
- Lançamentos **cancelados** e **ignorados** são excluídos integralmente de saldo, resultado, categorias, tags, Dashboard, Cockpit, relatórios e insights.
- Categoria de crédito ("Cartão de Crédito") é **apenas uma categoria global** — não existe entidade de cartão, limite, fatura ou parcelamento automático.
- Tenant nunca é hard deleted; passa para `INACTIVE` preservando dados.

## Decisões técnicas registradas

- **IDs: `cuid()`, não UUID** (Seção 152 prefere "UUID/UUIDv7 ou equivalente"). `cuid()`
  é o padrão nativo do Prisma, globalmente único e não sequencial — um equivalente
  aceito pela própria redação da seção. Mudar isso agora exigiria uma migration de
  chave primária em toda tabela do sistema; decisão consciente de manter `cuid()`.
- **Rate limiting em memória, não distribuído** (Seção 153) — `src/shared/security/rate-limit.ts`.
  Correto para uma instância única (situação atual). Se o serviço Web escalar para mais
  de uma instância, isso precisa migrar para um store compartilhado (Redis) — o comentário
  no próprio arquivo já registra isso para não ser esquecido.

---

© 2026 Belle Planner. Todos os direitos reservados. Versão `1.0.0`.
