# ENTREGA — Recorrência órfã + ordenação instável (v1.8.4)

## VERSÃO

**1.8.3 → 1.8.4** (patch — correção de bug real, confirmado com dados de
produção). Atualizado nos 4 locais de sempre.

## RESUMO DA INVESTIGAÇÃO

Dois problemas distintos, os dois confirmados com evidência real (prints
que você mandou da categoria Animais, dia 05/10):

### 1. Lançamento duplicado depois de excluir e recriar uma recorrência

Ao excluir uma recorrência no modo **"Do mês seguinte em diante"** (o
padrão, recomendado) — isso continua certo, nunca mexe no mês vigente nem
no passado. O bug era o que **sobra**: o lançamento do mês vigente
continuava **vinculado à série excluída**, mesmo ela já encerrada pra
sempre (`active: false`). Nada no sistema indicava que esse lançamento já
não pertencia a nenhuma recorrência viva — ele ficava "órfão". Se depois
disso uma recorrência nova fosse criada pro mesmo gasto, o mês vigente
acabava com duas transações pendentes: a órfã antiga + a nova. Foi
exatamente o que aconteceu com os dois lançamentos "PetShop" (R$ 275,00 e
R$ 176,00) do dia 05/10 — os dois reais, confirmados pelo Relatório
("Qtd. saídas: 2").

**Corrigido:** ao excluir uma recorrência no modo padrão, tudo que sobra
(mês vigente e passado) agora se desvincula de vez da série — vira uma
transação avulsa comum, exatamente como se tivesse sido criada sem
recorrência desde o início. Nada é apagado, criado, nem tem valor ou data
alterado — só o vínculo com a série morta é removido. Mesma correção
aplicada ao domínio de Programações, que tinha a mesma lógica e o mesmo
bug.

### 2. Lançamento do mesmo dia "piscando" na lista de Transações

A lista de Transações era ordenada só por data de vencimento (`dueDate`),
sem nenhum critério de desempate. Quando duas ou mais transações caem no
mesmo dia — muito comum, já que várias recorrências costumam vencer
junto —, o banco não garante sempre a mesma ordem entre elas de uma
consulta pra outra. Como a lista pagina de 15 em 15, isso fazia uma
transação específica "pular" de página sozinha de uma visita pra outra —
sumindo e reaparecendo sem nenhuma mudança real nos dados. Seus prints em
aba anônima (mesmo dia, duas cargas seguidas, conteúdo diferente) provam
exatamente isso.

**Corrigido:** a ordenação ganhou um segundo critério fixo de desempate
(`id`, que é único). Com isso, a mesma consulta sempre devolve a mesma
ordem — e portanto a mesma página — pro mesmo dado.

## IMPORTANTE — isso não limpa a duplicata que já existe hoje

Esta correção vale **daqui pra frente**: a próxima vez que você excluir
uma recorrência, o lançamento que sobrar não vai mais ficar órfão. Ela
**não apaga retroativamente** a duplicata do PetShop que já está lá
(R$ 275,00 + R$ 176,00) — essa você ainda precisa resolver manualmente
(excluir um dos dois, na tela de Transações). Se quiser, posso também
preparar uma limpeza automática pra achar e listar outras duplicatas
antigas que possam ter ficado de exclusões anteriores — me avisa se
quiser isso como um próximo passo.

## ARQUIVOS ALTERADOS

- `src/modules/recurrence/recurrence.service.ts` — `deleteSeriesWithOccurrences`,
  modo `FROM_NEXT_MONTH`: desvincula (`recurrenceSeriesId`/
  `recurrenceOccurrenceKey` → `null`) tudo que sobra da série excluída.
- `src/modules/programming/programming-recurrence.service.ts` —
  `deleteProgrammingSeriesWithOccurrences`, mesma correção.
- `src/modules/transactions/transaction.repository.ts` — `listTransactions`
  (lista paginada de Transações) e `listTransactionsForSimulation` ganham
  `id` como segundo critério de ordenação.
- `tests/integration/recurrence-flow.test.ts` e
  `tests/integration/programming.test.ts` — testes do modo
  `FROM_NEXT_MONTH` atualizados pra verificar a desvinculação (antes
  verificavam só "não apagou", agora também verificam "não ficou mais
  vinculado à série morta").
- `package.json`, `src/modules/backup/backup.service.ts`,
  `src/shared/ui/Footer.tsx`, `src/app/api/health/route.ts` — versão
  1.8.3 → 1.8.4.
- `CHANGELOG.md` — novo `## [1.8.4]`.

## MIGRATIONS

Nenhuma — `recurrenceSeriesId` e `recurrenceOccurrenceKey` já eram
colunas opcionais (`String?`), e a constraint única do banco já permite
vários registros com esses dois campos nulos ao mesmo tempo (é assim que
todo lançamento avulso, sem recorrência, já funciona hoje).

## QA EXECUTADO

- `npx eslint` nos arquivos alterados — sem erros.
- `npx prettier --check` — no padrão.
- `npx vitest run --exclude "tests/integration/**"` — **170/170 testes
  unitários passando**.
- `npx tsc --noEmit` — seguiu em **93 linhas**, mesma contagem de antes
  desta entrega, sem nenhum erro novo.
- **Testes de integração** (`recurrence-flow.test.ts`,
  `programming.test.ts`) — atualizados para cobrir o novo comportamento,
  mas **não rodam neste ambiente** (o sandbox não tem acesso ao binário
  real do Prisma pra conectar num Postgres de verdade — limitação já
  conhecida, documentada nas entregas anteriores). Rodam normalmente no
  CI real do GitHub Actions — recomendo conferir o resultado lá antes de
  promover pro Railway, como sempre.

## COMO SUBIR

Sem migration — só subir os arquivos. Depois do deploy, recomendo:
1. Conferir que o CI passou (os dois arquivos de teste de integração
   alterados).
2. Resolver manualmente a duplicata do PetShop (R$ 275,00 / R$ 176,00) que
   já está em produção — excluir uma das duas em Transações.
3. Testar o fluxo uma vez: criar uma recorrência de teste, excluir no modo
   padrão, e conferir que o lançamento do mês continua lá mas sem nenhuma
   recorrência vinculada (sem o badge/indicador de recorrência, se a tela
   mostrar um).
