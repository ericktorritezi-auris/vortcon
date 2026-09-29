# ENTREGA — Simulação: responsivo no mobile (v1.8.3)

## VERSÃO

**1.8.2 → 1.8.3** (patch — ajuste visual/estrutural na tela de Simulação,
sem mudança de cálculo ou comportamento de seleção). Atualizado nos 4
locais de sempre.

## RESUMO

A tela **Simulação** estava completamente quebrada no mobile: a lista usava
uma grade fixa de 6 colunas (em pixels) e o painel de previsão ficava fixo
do lado com largura fixa (`w-80`) — nenhum dos dois cabia em tela estreita,
causando estouro horizontal.

Solução adotada (conforme conversamos): manter a Simulação disponível em
qualquer tela, sem virar "só web" — ajustando o layout pra funcionar bem
nos dois tamanhos, no mesmo ponto de corte (`md`, 768px) que o app já usa
pra trocar entre o menu mobile e a barra lateral desktop.

- **Abaixo de `md` (mobile):**
  - A lista vira **cartões empilhados** — cada lançamento mostra checkbox,
    descrição, categoria, tipo, status e valor, no mesmo padrão visual já
    usado em Transações.
  - O **painel de previsão** vira uma **barra fixa no rodapé** mostrando só
    o Resultado líquido e a quantidade de itens selecionados. Tocando nela,
    expande pra cima mostrando o detalhe completo (A receber, A pagar e a
    lista de itens selecionados com o acumulado).
  - Os **filtros** passam a ocupar a largura toda, em duas colunas, em vez
    de forçar rolagem lateral.
- **Em `md` e acima (desktop): nada mudou** — mesma grade de 6 colunas,
  mesmo painel fixo do lado, exatamente como estava.

Nenhum cálculo foi tocado — `simulation-calculations.ts` (o módulo puro que
soma os itens selecionados) não sofreu nenhuma alteração nesta entrega. É
puramente uma reorganização de onde e como a mesma informação aparece na
tela.

## ARQUIVOS ALTERADOS

- `src/app/app/simulacao/SimulationView.tsx` — layout responsivo: lista com
  versão em cartões (mobile, `md:hidden`) e versão em grade (desktop,
  `hidden md:grid`); painel de previsão extraído para um componente
  reaproveitado (`SummaryPanelContent`) usado tanto no painel fixo lateral
  do desktop quanto na barra fixa expansível do mobile; filtros em grade
  responsiva.
- `package.json`, `src/modules/backup/backup.service.ts`,
  `src/shared/ui/Footer.tsx`, `src/app/api/health/route.ts` — versão
  1.8.2 → 1.8.3.
- `CHANGELOG.md` — novo `## [1.8.3]`.

Não precisou alterar `page.tsx` nem `simulation-calculations.ts` — o
problema era só de apresentação.

## MIGRATIONS

Nenhuma.

## QA EXECUTADO

- `npx eslint` no arquivo alterado — sem erros.
- `npx prettier --check` (todos os arquivos alterados) — no padrão.
- `npx vitest run --exclude "tests/integration/**"` — **170/170 testes
  unitários passando** (nenhum teste depende de layout, então nenhum foi
  afetado).
- `npx tsc --noEmit` — segue em **93 linhas**, mesma contagem de antes
  desta entrega, sem nenhum erro novo introduzido pela mudança.

## COMO SUBIR

Sem migration — só subir os arquivos e o deploy no Railway segue normal.
Recomendo testar rapidamente em um celular real (ou modo responsivo do
navegador) depois do deploy: abrir Simulação, selecionar 2-3 lançamentos e
conferir que a barra do rodapé expande/recolhe e mostra os valores certos.
