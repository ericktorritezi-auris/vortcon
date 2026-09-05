# Módulo: plans

Catálogo de planos comerciais (ex.: VortCon Pro) — não são tiers de feature (Seções 102-105).

## Implementado (Estágio 6)

`plan.service.ts` — CRUD de planos. Nunca hard delete (Seção 102): `deactivatePlan`
inativa, preservando histórico de qualquer assinatura que já referencia o plano.
Editar plano nunca altera `contractedPriceCents` de assinaturas existentes (Seção 107).

Seed idempotente do "VortCon Pro" (R$ 49,90, mensal) em `prisma/seed.ts`, encadeado no
`start` (ver README raiz, seção Deploy).
