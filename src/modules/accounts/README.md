# Módulo: accounts

Contas financeiras (onde o dinheiro está) — saldo real por conta (Seções 39-40).

## Implementado (Estágio 7)

`account.service.ts` — CRUD de contas. Saldo nunca é uma coluna mutável própria — é
sempre derivado pelo Financial Engine (`getAccountBalances`). Conta em uso prefere
inativação (mesmo padrão de categorias, Seção 50).
