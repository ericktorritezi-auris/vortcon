# Módulo: cockpit

Resumo mensal analítico (Seção 86-90).

## Implementado (Estágio 11)

- `financial-engine.service.ts` ganhou `getBalanceAsOf(tenantId, asOfDate)` —
  generalização de `getAccountBalances`/`getRealBalance` com corte por data de
  liquidação, necessária pra "saldo inicial" e "posição final" do mês (Seção 86).
  Validado via SQL direto em 3 pontos no tempo (antes/entre/depois de duas
  liquidações).
- `cockpit-highlights.ts` — seleção pura de destaques de categoria (Seção 87: maior
  saída, maior entrada, maior resultado líquido positivo/negativo, categorias que
  cresceram em despesa/receita vs. mês anterior). "Não presumir que categoria
  pertence só a um lado" — testado explicitamente (uma categoria pode ser maior saída
  E crescer em receita ao mesmo tempo).
- `cockpit.service.ts` — compõe o Financial Engine (nunca reimplementa cálculo).
  Sempre recomputado ao vivo (Seção 88: "correção histórica recalcula Cockpit" — sem
  nenhum botão de "recalcular", a próxima consulta já reflete a edição).
- `CockpitAcknowledgement` (Seção 38 já previa esta entidade) — virada do mês (Seção
  89): "Seu resumo financeiro de [mês] está pronto", uma vez por mês, persistido.
- UI em `/app/cockpit`: navegador de mês (mesmo padrão de Transações/Transferências),
  5 métricas principais, comparação com o mês anterior (barras, sem dependência
  externa), destaques de categoria, placeholder honesto de Insights (Insight Engine é
  estágio futuro).

Teste de integração (`cockpit.test.ts`) cobre saldo inicial vs. posição final entre
meses, recálculo automático após correção histórica, e o ciclo de virada do mês.
