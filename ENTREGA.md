# VortCon — Entrega: histórico de ajustes de valor (botões +/- na edição)

## VERSÃO

`1.6.3` → `1.7.0` (minor — funcionalidade nova, nenhuma quebra de contrato existente)

Atualizada nos 4 locais rastreados: `package.json`, `src/modules/backup/backup.service.ts`
(`VORTCON_VERSION`), `src/shared/ui/Footer.tsx` (`APP_VERSION`), `src/app/api/health/route.ts`
(`version`, nos dois branches do healthcheck).

## O QUE FOI PEDIDO

Você aprovou a demo interativa depois de duas rodadas de ajuste:

1. Botões "−"/"+" do lado do campo Valor, na edição de uma transação — clicar abre uma
   caixinha pra digitar o ajuste, confirmar no ✓ soma/subtrai do valor e grava uma linha no
   "Histórico do valor" (dia + valor do ajuste, sem descrição).
2. A data do histórico é sempre automática (a data do lançamento do ajuste) — nunca
   digitada.
3. Editar o campo Valor direto, sem usar +/-, continua funcionando exatamente como sempre e
   **não** gera histórico.
4. Cada linha do histórico ganha um ✕ vermelho — exclui aquele lançamento e recalcula o
   valor total da transação, desconsiderando ele.
5. Afeta só aquela transação específica — nunca todas ao mesmo tempo, nunca nenhum cálculo
   do Financial Engine.
6. Respeita a tela de edição que já existe hoje (não é uma tela nova).
7. Ajuda atualizada.

## COMO FOI IMPLEMENTADO

### Banco de dados

Uma tabela nova, `transaction_value_adjustments` — nenhuma coluna existente muda:

```
id            text (pk)
transactionId text (fk -> financial_transactions, ON DELETE CASCADE)
deltaCents    integer   -- pode ser + ou -, nunca 0
createdAt     timestamp -- sempre automático (default now()), nunca vem do client
```

`ON DELETE CASCADE`: se a transação for excluída de vez (Seção 78 — só depois de cancelada),
o histórico dela some junto, sem deixar linha órfã.

### Backend

- **Uma sessão de edição = um "Salvar" só**, exatamente como hoje. O botão ✓ da caixinha de
  ajuste só atualiza o valor **na tela** e guarda o ajuste numa lista local — nada vai pro
  servidor até você clicar "Salvar" no rodapé do drawer, igual sempre foi.
- O `PATCH /api/transactions/:id` que já existia ganhou dois campos **opcionais**:
  `valueAdjustments` (lista de novos ajustes desta sessão) e `removeValueAdjustmentIds`
  (ids de ajustes já salvos que você excluiu com o ✕). Quando omitidos — ou seja, em
  qualquer edição que não usa os botões +/- — o comportamento é **idêntico a hoje, byte a
  byte**. Isso é o que garante "zero impacto no que já está funcionando".
- Tudo (o valor final da transação, os ajustes novos, as exclusões) é salvo **numa única
  transação de banco** — ou tudo acontece, ou nada acontece.
- Excluir (✕) um ajuste já salvo desfaz **exatamente aquele delta** do valor atual — não
  recalcula "do zero" a partir de um valor inicial fixo. Isso é mais robusto que a demo:
  funciona certo mesmo se, entre um ajuste e outro, você também tiver editado o valor
  direto no campo (sem +/-) em alguma sessão anterior.
- Ownership (Seção 210): a exclusão de um ajuste é sempre filtrada pela transação
  específica — mesmo que alguém tentasse forjar um id de ajuste de outra transação, nada
  seria apagado fora do escopo certo.

### Tela (respeitando a edição que já existe)

- **Nada de tela nova.** O componente `TransactionFormFields` (usado tanto pra criar quanto
  pra editar) ganhou um único slot opcional, `valueExtra`, renderizado logo abaixo do campo
  Valor — só a tela de **edição** passa conteúdo nele (os botões +/-, a caixinha de ajuste e
  o histórico); a tela de **criação** nunca passa nada ali, então continua pixel-a-pixel
  igual ao que já era.
- Histórico visível tanto no detalhe (somente leitura) quanto na edição (com o ✕).
- Reaproveitei o componente `FinancialValue` que já existe pra formatar/colorir os valores do
  histórico — mesma formatação monetária do resto do app.

### Arquivos desta entrega

**Novos (2):**

- `prisma/migrations/20260919090000_transaction_value_adjustments/migration.sql`
- `src/app/app/transacoes/TransactionValueHistory.tsx` — lista do histórico (usada no
  detalhe e na edição).

**Alterados (14):**

- `prisma/schema.prisma` — modelo `TransactionValueAdjustment` + relação em
  `FinancialTransaction`.
- `src/modules/transactions/transaction.repository.ts` — `updateTransaction` passa a
  aceitar `valueAdjustments`/`removeValueAdjustmentIds` (opcionais); `findTransactionById` e
  `listTransactions` passam a incluir o histórico.
- `src/modules/transactions/transaction.service.ts` — repassa os campos novos.
- `src/app/api/transactions/[id]/route.ts` — schema do PATCH aceita os dois campos novos
  (validação: cada delta é um inteiro diferente de zero).
- `src/app/app/transacoes/TransactionsView.tsx` — tipo `TransactionItemView` ganha
  `valueAdjustments`.
- `src/app/app/transacoes/TransactionFormFields.tsx` — slot opcional `valueExtra` (zero
  mudança quando não usado).
- `src/app/app/transacoes/TransactionDetailDrawer.tsx` — botões +/-, caixinha de ajuste,
  ✕ de exclusão, histórico no detalhe e na edição.
- `src/app/app/ajuda/HelpContent.tsx` — nova pergunta na seção "Transações" explicando o
  recurso.
- `tests/integration/transactions-flow.test.ts` — 4 testes novos (ver QA).
- `package.json`, `src/modules/backup/backup.service.ts`, `src/shared/ui/Footer.tsx`,
  `src/app/api/health/route.ts` — bump de versão.

## MIGRATIONS

Uma migration nova (`20260919090000_transaction_value_adjustments`) — cria só a tabela
`transaction_value_adjustments`. Testei aplicando ela (e todas as anteriores, em ordem) contra
um PostgreSQL real neste ambiente — rodou sem nenhum erro, e a tabela final bate exatamente
com o schema (colunas, tipos, índice, FK com `ON DELETE CASCADE`).

## QA EXECUTADO

- `npm run lint` — ✅ limpo (0 erros, 0 warnings), projeto inteiro.
- `npx prettier --check .` — ✅ limpo, projeto inteiro.
- `npx vitest run` (unitários, sem banco) — ✅ 23 arquivos, 159 testes, todos passando.
- **Migration aplicada contra PostgreSQL real** (consegui subir um Postgres local neste
  ambiente desta vez) — todas as 17 migrations do projeto, em ordem, incluindo a desta
  entrega, aplicaram sem erro. Conferi a tabela resultante à mão (`\d
transaction_value_adjustments`) e bate exatamente com o `schema.prisma`.
- **Testes de integração (os 4 novos) contra banco real**: aqui esbarrei de novo na mesma
  limitação de sempre (`binaries.prisma.sh` bloqueado neste sandbox — não consigo baixar o
  engine do Prisma pra rodar o Prisma Client de verdade, só apliquei a migration via SQL
  puro). Não deu pra rodar o `npm run test` de ponta a ponta aqui. Os 4 testes novos cobrem:
  edição direta sem histórico, dois ajustes seguidos (+1000, +10000) conferindo soma e
  `createdAt` automático, exclusão de um ajuste (✕) recalculando o valor certo, e exclusão
  da transação apagando o histórico junto (cascade). Recomendo, como sempre, deixar o
  GitHub Actions real confirmar.
- `npm run typecheck` — mesma limitação de sempre (tipos genéricos do `@prisma/client` sem
  o engine baixado). Isolei os erros que tocam os arquivos desta entrega: nenhum novo,
  nenhum menciona `TransactionValueAdjustment` ou `valueAdjustments` especificamente — só o
  mesmo padrão genérico pré-existente que já afeta o projeto inteiro.

## COMO TESTAR MANUALMENTE APÓS O DEPLOY

1. Abra uma transação existente e clique em "Editar".
2. Do lado do campo Valor, clique no "+" → digite um valor → confirme no ✓. O valor muda na
   hora e aparece uma linha em "Histórico do valor" com "Hoje" (vira a data real ao salvar).
3. Clique em "Salvar". Reabra a transação (detalhe) — o histórico aparece lá também, com a
   data certa.
4. Edite de novo, use o "−" dessa vez, e confirme.
5. Ainda editando, clique no ✕ de um dos lançamentos do histórico — o valor total muda na
   hora, sem precisar salvar antes.
6. Edite o campo Valor direto (sem usar +/-) e salve — confirme que **nenhuma** linha nova
   aparece no histórico.
7. Confira a Ajuda → Transações → nova pergunta sobre o histórico do valor.
