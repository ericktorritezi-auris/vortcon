# Módulo: categories

Categorias globais e transversais do tenant — NUNCA tipadas por natureza financeira (Seções 41-50, 225).

## Implementado (Estágio 7)

`category.service.ts` — CRUD (nunca hard delete, Seção 50), e `getCategoryReport` que
devolve os dois lados (entradas/saídas) + resultado líquido via Financial Engine
(`getCategoryFlow`). O modelo `Category` não tem e nunca terá campo `type`/`nature`.
