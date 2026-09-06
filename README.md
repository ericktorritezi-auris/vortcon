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

| Item                    | Valor                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Versão                  | `1.0.0` (baseline em construção)                                                                                  |
| Estágio atual           | Estágio 8 — Recorrências ✅ concluído                                                                             |
| Próximo estágio         | Estágio 9 — Transações (UX)                                                                                       |
| Plano comercial inicial | VortCon Pro — R$ 49,90/mês                                                                                        |
| Domínio oficial         | `vortcon.belleplanner.com.br`                                                                                     |
| Documento normativo     | `VortCon_Direcionamento.md` (Master Document v1.0.0) — prevalece sobre qualquer implementação em caso de conflito |

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
- **Infraestrutura:** Railway (Web Service + Worker + PostgreSQL)

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

Processos assíncronos (outbox transacional, notificações, recorrências, backups) rodam em um **Worker** separado do Web Service, com jobs idempotentes.

```bash
npm run worker
```

## PWA

Manifest, ícones (favicon 16/32px, ícone de app 64px+) e service worker para instalação e push. **Não é offline-first**: não há operação financeira completa sem conexão.

## E-mail (Resend)

Envio transacional (convite, boas-vindas, recuperação de senha, avisos de assinatura, lembretes) via Resend, disparado por um **Transactional Outbox** para garantir consistência com o banco.

## Deploy (Railway)

Infraestrutura oficial: Railway (não Heroku), com topologia Web + Worker + PostgreSQL.

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

---

© 2026 Belle Planner. Todos os direitos reservados. Versão `1.0.0`.
