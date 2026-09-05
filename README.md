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
| Estágio atual           | Estágio 1 — Fundação técnica ✅ concluído                                                                         |
| Próximo estágio         | Estágio 2 — Design System                                                                                         |
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
