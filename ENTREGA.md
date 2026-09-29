# ENTREGA — Simulação: descrição na coluna (v1.8.2)

## VERSÃO

**1.8.1 → 1.8.2** (patch — ajuste pontual na tela de Simulação, sem
mudança de comportamento além da exibição). Atualizado nos 4 locais de
sempre.

## O QUE MUDOU

Na tela **Simulação**, a coluna que só mostrava a Categoria agora mostra:

- **Descrição da transação** — linha principal, em destaque.
- **Categoria** — linha secundária, menor e em cinza, logo abaixo.

Mesma hierarquia visual que já existe em Transações (descrição em
destaque, categoria como legenda). O cabeçalho da coluna passou de
"Categoria" pra "Descrição", já que ela virou a informação principal.

Também ajustei, pelo mesmo motivo, o painel de previsão (cada item
selecionado agora mostra a descrição, com "Categoria · Acumulado: valor"
embaixo) e os rótulos acessíveis (leitor de tela) da caixinha de seleção e
do botão de remover, que agora usam a descrição em vez da categoria.

## ARQUIVOS ALTERADOS

- `src/app/app/simulacao/page.tsx` — passa `description` da transação pro
  client component (o campo já existia no banco, só não estava sendo
  repassado).
- `src/app/app/simulacao/SimulationView.tsx` — exibe descrição + categoria
  na lista e no painel de previsão.
- `tests/integration/commercial-flow.test.ts` — só um ajuste de tipagem
  (parâmetro que ficou implicitamente `any` depois da correção da 1.8.1),
  sem mudança de lógica.
- `package.json`, `src/modules/backup/backup.service.ts`,
  `src/shared/ui/Footer.tsx`, `src/app/api/health/route.ts` — versão
  1.8.1 → 1.8.2.
- `CHANGELOG.md` — novo `## [1.8.2]`.

## MIGRATIONS

Nenhuma — `description` já existia na tabela, só não estava sendo lido
por essa tela.

## QA EXECUTADO

- `npx eslint` nos arquivos alterados — sem erros.
- `npx prettier --check` — no padrão.
- `npx vitest run --exclude "tests/integration/**"` — **170/170 testes
  unitários passando**.
- `npx tsc --noEmit` — voltou pra **93 linhas** (mesma contagem de antes
  da correção da 1.8.1, sem nenhum erro novo), depois de tipar o
  parâmetro que tinha ficado `any` implícito.

## COMO SUBIR

Sem migration — só subir os arquivos e o deploy no Railway segue normal.
