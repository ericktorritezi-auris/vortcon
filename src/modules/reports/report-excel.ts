import ExcelJS from 'exceljs';
import type { ReportFilterSummary, ReportResult } from './report.service';
import { sanitizeExcelCell } from './excel-sanitize';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Paga',
  RECEIVED: 'Recebida',
  CANCELLED: 'Cancelada',
};

/**
 * Excel do relatório (Seção 101): server-side (roda aqui, nunca no
 * navegador), reflete exatamente os filtros aplicados, protegido contra
 * formula injection (Seção 101 — toda célula de texto vinda do usuário
 * passa por sanitizeExcelCell, nunca gravada crua).
 */
export async function buildReportWorkbook(
  result: ReportResult,
  filterSummary: ReportFilterSummary,
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VortCon';
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet('Resumo');
  summarySheet.columns = [{ width: 28 }, { width: 24 }];
  summarySheet.addRow(['Relatório VortCon', filterSummary.periodLabel]);
  summarySheet.addRow([]);
  if (filterSummary.categoryLabel) {
    summarySheet.addRow(['Categoria', sanitizeExcelCell(filterSummary.categoryLabel)]);
  }
  if (filterSummary.accountLabel) {
    summarySheet.addRow(['Conta', sanitizeExcelCell(filterSummary.accountLabel)]);
  }
  if (filterSummary.tagLabel) {
    summarySheet.addRow(['Tag', sanitizeExcelCell(filterSummary.tagLabel)]);
  }
  if (filterSummary.statusLabel) summarySheet.addRow(['Status', filterSummary.statusLabel]);
  if (filterSummary.natureLabel) summarySheet.addRow(['Natureza', filterSummary.natureLabel]);
  summarySheet.addRow([]);
  summarySheet.addRow([
    'Total de receitas',
    currencyFormatter.format(result.totalIncomeCents / 100),
  ]);
  summarySheet.addRow([
    'Total de despesas',
    currencyFormatter.format(result.totalExpenseCents / 100),
  ]);
  summarySheet.addRow(['Resultado', currencyFormatter.format(result.totalResultCents / 100)]);
  summarySheet.addRow([
    'Saldo geral (atual)',
    currencyFormatter.format(result.currentRealBalanceCents / 100),
  ]);

  if (result.categorySummary) {
    summarySheet.addRow([]);
    summarySheet.addRow([`Categoria: ${sanitizeExcelCell(result.categorySummary.categoryName)}`]);
    summarySheet.addRow([
      'Receitas',
      currencyFormatter.format(result.categorySummary.incomeCents / 100),
    ]);
    summarySheet.addRow([
      'Despesas',
      currencyFormatter.format(result.categorySummary.expenseCents / 100),
    ]);
    summarySheet.addRow([
      'Resultado líquido',
      currencyFormatter.format(result.categorySummary.netResultCents / 100),
    ]);
    summarySheet.addRow(['Quantidade de entradas', result.categorySummary.incomeCount]);
    summarySheet.addRow(['Quantidade de saídas', result.categorySummary.expenseCount]);
  }

  const movementsSheet = workbook.addWorksheet('Movimentações');
  movementsSheet.columns = [
    { header: 'Mês', key: 'month', width: 16 },
    { header: 'Data', key: 'date', width: 14 },
    { header: 'Descrição', key: 'description', width: 32 },
    { header: 'Natureza', key: 'type', width: 12 },
    { header: 'Categoria', key: 'category', width: 20 },
    { header: 'Conta', key: 'account', width: 20 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Valor', key: 'amount', width: 16 },
  ];
  movementsSheet.getRow(1).font = { bold: true };

  for (const month of result.months) {
    for (const movement of month.movements) {
      movementsSheet.addRow({
        month: month.monthLabel,
        date: dateFormatter.format(new Date(movement.dueDate)),
        description: sanitizeExcelCell(movement.description),
        type: movement.type === 'INCOME' ? 'Receita' : 'Despesa',
        category: movement.categoryName ? sanitizeExcelCell(movement.categoryName) : '—',
        account: sanitizeExcelCell(movement.accountName),
        status: STATUS_LABEL[movement.status] ?? movement.status,
        amount: currencyFormatter.format(movement.amountCents / 100),
      });
    }
  }

  return workbook.xlsx.writeBuffer();
}
