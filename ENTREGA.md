# ENTREGA — Simulação (novo menu)

## VERSÃO

**1.7.0 → 1.8.0** (bump de MINOR — feature nova pro usuário final, mesmo
padrão dos incrementos anteriores: 1.6.x eram correções, 1.7.0 e agora
1.8.0 são features). Atualizado nos 4 locais de sempre: `package.json`,
`backup.service.ts` (`VORTCON_VERSION`), `Footer.tsx` (`APP_VERSION`) e
`health/route.ts` (`version`, as duas branches).

## RESUMO

Novo item de menu **"Simulação"**, ao lado de Relatórios (grupo
financeiro), com um ícone de balança pra não repetir o ícone de
calculadora já usado no Ajuda pela ferramenta de cálculo rápido do menu do
avatar.

Tela **100% de consulta** — sem nenhum botão de editar, criar, cancelar ou
excluir, sem nenhuma escrita no banco. Existe pra você montar cenários
("se eu pagar/receber tudo isso junto, quanto dá?") sem depender de
planilha.

**Filtros** (sempre abrindo em "Todos/Todas"):

- **Período** — sempre mês (com as setas de navegação, igual Transações),
  nunca um intervalo de datas.
- **Receitas/Despesas** — Todas / Somente receitas / Somente despesas.
- **Categoria** — Todas ou uma específica.
- **Conta** — Todas ou uma específica.
- **Status** — Todos, Pendente, Paga, Recebida ou Cancelada (os 4 valores
  reais do sistema, confirmado com você).

**Lista**, uma linha por lançamento: Data, Categoria, Tipo (Receita/
Despesa), Status, Valor — e uma caixinha de seleção em cada linha.

**Painel de previsão**, ao lado: soma o que foi marcado, mostrando o
acumulado crescendo a cada seleção (o "essa é R$ 100, +R$ 100 = R$
200..." que você descreveu), separado em "A receber" (soma das receitas
marcadas), "A pagar" (soma das despesas marcadas) e "Resultado líquido".
Cada item selecionado pode ser removido da soma tanto desmarcando a
caixinha na lista quanto clicando no ✕ do próprio painel.

**Comportamento da seleção ao trocar filtro**: marcar itens com um filtro,
trocar o filtro (Tipo/Categoria/Conta/Status) e continuar marcando não
apaga o que já estava selecionado — exatamente o fluxo que você descreveu
(filtrar Despesas, selecionar algumas, filtrar Receitas, selecionar mais).
Só trocar de **mês** zera a seleção, porque aí o universo de lançamentos
em tela é outro de verdade.

**Nenhum impacto no resto do sistema**: a soma da Simulação é calculada
isoladamente (`simulation-calculations.ts`), nunca passa pelo Financial
Engine, Cockpit ou Relatórios — o saldo e todos os outros cálculos
continuam usando só o `amountCents` de cada transação, como sempre.

## ARQUIVOS NOVOS

- `src/app/app/simulacao/page.tsx` — server component: acesso, período do
  mês via `?mes=`, busca contas/categorias/transações do mês (sem
  paginação — a tela precisa do mês inteiro pra somar direito).
- `src/app/app/simulacao/SimulationView.tsx` — client component: filtros,
  lista, painel de previsão, navegação de mês.
- `src/app/app/simulacao/simulation-calculations.ts` — lógica pura de
  filtro e soma (sem nenhuma dependência de banco/React), fácil de testar
  isolada.
- `src/app/app/simulacao/simulation-calculations.test.ts` — 11 testes
  unitários cobrindo filtro por tipo/categoria/conta/status (incluindo
  cancelada), soma separada receita/despesa, ordem do acumulado, e um item
  selecionado que não existe mais na lista.

## ARQUIVOS ALTERADOS

- `src/modules/transactions/transaction.repository.ts` — nova função
  `listTransactionsForSimulation(tenantId, from, to)`: lista TODAS as
  transações do mês (sem paginação, sem filtro de tipo/categoria/conta/
  status — isso é feito no client, de propósito, pra seleção sobreviver a
  troca de filtro). Inclui canceladas, mesmo critério já usado em
  `listTransactions`.
- `src/modules/transactions/transaction.service.ts` — reexporta a nova
  função.
- `src/shared/ui/Sidebar.tsx` — novo item de menu "Simulação".
- `src/app/app/ajuda/HelpContent.tsx` — nova seção "Simulação" explicando
  pra que serve, como usar, o comportamento da seleção ao trocar filtro, e
  que editar valor continua sendo só em Transações.
- `package.json`, `src/modules/backup/backup.service.ts`,
  `src/shared/ui/Footer.tsx`, `src/app/api/health/route.ts` — versão
  1.7.0 → 1.8.0.
- `CHANGELOG.md` — novo `## [1.8.0]`.

## MIGRATIONS

Nenhuma. A tela só lê campos já existentes em `FinancialTransaction` —
nenhuma mudança de schema.

## QA EXECUTADO

- `npx eslint` nos arquivos desta entrega — sem erros.
- `npx prettier --check` (após `--write`) — todos no padrão.
- `npx vitest run --exclude "tests/integration/**"` — **170/170 testes
  unitários passando** (24 arquivos; os 11 novos de
  `simulation-calculations.test.ts` incluídos).
- `npx tsc --noEmit` — contagem total foi de 87 pra **93 linhas**; toda a
  diferença é o mesmo "muro" genérico documentado desde o Estágio 1
  (`@prisma/client` "no exported member" — limitação só deste sandbox, não
  afeta o build real no Railway/GitHub Actions). Um erro novo real
  apareceu no meio do processo (`implicitly has an 'any' type` num
  `.map()`) e foi corrigido tipando o parâmetro a partir do retorno da
  própria função — depois disso, zero erros de lógica novos, só o muro.
- Não precisou de migration, então não houve necessidade de validar SQL
  contra o Postgres local desta vez.

## COMO SUBIR

Sem migration — é só subir os arquivos novos/alterados pro GitHub (mesmos
caminhos) e o deploy no Railway segue normal.
