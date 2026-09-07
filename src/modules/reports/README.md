# Módulo: reports

Relatórios completos com filtros, exportação em PDF e Excel (Seção 94-101).

## Implementado (Estágio 12)

- `report.service.ts` — `buildReport` aplica todos os filtros da Seção 94 (mês/
  período, categoria, conta, tag, status, natureza) e sempre agrupa por mês (pedido
  explícito do cliente: período de mais de um mês vem sempre dividido por mês).
  `resolveReportFilters` traduz os parâmetros da URL em filtros + rótulos legíveis,
  compartilhado entre a página e as duas rotas de exportação — garante que o PDF/
  Excel reflitam exatamente os mesmos filtros vistos na tela (Seção 100/101).
- `report-grouping.ts` — agrupamento por mês extraído como lógica pura, testável
  isoladamente (4 testes, incluindo a regra de exclusão de canceladas do total).
- Relatório por categoria (Seção 96): quando uma categoria é filtrada, calcula
  receitas/despesas/resultado líquido/quantidade de entradas e saídas/evolução
  mensal — testado contra Postgres real reproduzindo o formato do exemplo da
  especificação.
- `report-excel.ts` — Excel gerado **server-side** com `exceljs`, protegido contra
  formula injection (Seção 101): todo texto vindo do usuário passa por
  `sanitizeExcelCell` antes de virar célula. Testado com um exploit clássico
  (`=cmd|"/c calc"!A1`) tanto na função pura quanto na geração real do arquivo.
- `report-pdf.tsx` — PDF com **template dedicado** via `@react-pdf/renderer` (Seção
  100: nunca captura de tela) — layout próprio com cabeçalho, cards de resumo, e
  tabela por mês. Validado contra bytes reais (assinatura `%PDF-`).
- UI em `/app/relatorios`: todos os filtros da Seção 94, resumo por categoria quando
  aplicável, saldo geral, movimentações agrupadas por mês. Exportação (PDF/Excel)
  só aparece em telas sm+ — mobile é só visualização (Seção 99).

Teste de integração (`reports.test.ts`) valida contra PostgreSQL real: divisão por
mês, totais do relatório por categoria, resolução de filtros pela URL, e geração
real dos dois arquivos de exportação (com assinatura de arquivo verificada).
