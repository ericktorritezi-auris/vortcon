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

| Item | Valor |
|---|---|
| Versão | `1.0.0` (baseline em construção) |
| Estágio atual | Estágio 0 — README e repositório |
| Plano comercial inicial | VortCon Pro — R$ 49,90/mês |
| Domínio oficial | `vortcon.belleplanner.com.br` |
| Documento normativo | `VortCon_Direcionamento.md` (Master Document v1.0.0) — prevalece sobre qualquer implementação em caso de conflito |

Este README evolui junto com o desenvolvimento. Ele é a documentação operacional raiz do projeto, não um arquivo descartável.

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

```
merge → CI (install/lint/typecheck/unit/integration/build) → migrations → Railway → smoke tests
```

## Versionamento

SemVer (`MAJOR.MINOR.PATCH`), iniciando em `1.0.0`. Branch principal: `main`.

## Troubleshooting

_A ser expandido conforme o projeto avança — decisões de infraestrutura, erros comuns de ambiente e runbooks de incidentes entram aqui progressivamente._

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
