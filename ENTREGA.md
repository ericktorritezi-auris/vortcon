# ENTREGA — Correção de teste no CI (v1.8.1)

## VERSÃO

**1.8.0 → 1.8.1** (patch — correção de teste, sem nenhuma mudança de
comportamento em produção). Mesmo padrão da 1.6.3, que corrigiu um bug
parecido no mesmo arquivo. Atualizado nos 4 locais de sempre.

## O QUE ACONTECEU

O CI rodou `commercial-flow.test.ts` e falhou em 2 testes:

- `sem atraso, nenhum bloqueio e aplicado` — esperava 0 bloqueios, achou 1.
- `Seção 174 — atraso claramente dentro da carência nunca bloqueia` —
  esperava `false`, achou `true`.

**Não é um bug de produção** — é a mesma classe de bug da 1.6.3: um teste
cuja fixture depende de "hoje" sem perceber, e que só quebra quando o
calendário real cai num ponto específico do mês.

## CAUSA

O teste de idempotência de `ensureCurrentMonthCharge` (alguns testes antes
dos que falharam) cria, como efeito colateral esperado, a cobrança do mês
**vigente**. Essa cobrança herda o dia de vencimento (dia 15) de
`firstDueDateNextMonth()` — só que esse "dia 15" foi pensado pro mês
**seguinte** (a 1ª cobrança do provisionamento), não pro mês vigente.

Rodando o CI depois do dia 20 de qualquer mês (dia 15 + 5 dias de
carência — Seção 113), essa cobrança nasce no teste **já vencida além da
carência**. Nenhum teste seguinte paga ou neutraliza especificamente ela
(os testes de bloqueio abaixo mexem é na cobrança do provisionamento, de
competência diferente) — ela fica pendurada, e qualquer reavaliação de
inadimplência mais adiante na suíte encontra ela e cria um bloqueio
"fantasma" que os testes seguintes não esperavam.

Confirmei rastreando os IDs/competências de cada cobrança pelos testes um
por um — o comportamento do código de produção (`evaluateAndApplyDelinquency`)
está correto em cada passo; é a fixture do teste que não previu esse
cenário.

## CORREÇÃO

Em `tests/integration/commercial-flow.test.ts`, logo depois do teste de
idempotência provar o que precisa provar (contagem antes/depois da 2ª
chamada), a cobrança do mês vigente criada como efeito colateral tem o
vencimento empurrado pra um futuro seguro (hoje + 60 dias) — a data dela
nunca fez parte do que aquele teste precisa validar, só a contagem.

Rastreei manualmente os 8 testes seguintes do arquivo pra confirmar que
nenhum depende da cobrança do mês vigente continuar com o vencimento
original (dia 15) — todos que manipulam cobrança pegam a de competência
mais recente (a do provisionamento), que é uma cobrança diferente.

## ARQUIVOS ALTERADOS

- `tests/integration/commercial-flow.test.ts` — a correção.
- `package.json`, `src/modules/backup/backup.service.ts`,
  `src/shared/ui/Footer.tsx`, `src/app/api/health/route.ts` — versão
  1.8.0 → 1.8.1.
- `CHANGELOG.md` — novo `## [1.8.1]`.

## MIGRATIONS

Nenhuma.

## QA EXECUTADO

- `npx eslint` no arquivo alterado — sem erros.
- `npx prettier --check` — no padrão.
- `npx vitest run --exclude "tests/integration/**"` — **170/170 testes
  unitários passando**.
- Não consegui rodar o teste de integração corrigido aqui neste sandbox
  (mesma limitação de rede já documentada: o binário de engine do Prisma
  não baixa aqui) — a correção foi validada rastreando manualmente, teste
  por teste, quais cobranças cada um lê/escreve, e confirmando que nenhum
  depende da data que estou mudando. Vai rodar de verdade no próximo CI.

## COMO SUBIR

Só o arquivo de teste + os 4 de versão. Sem migration, sem mudança de
código de produção.
