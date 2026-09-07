import { Document, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import type { ReportFilterSummary, ReportResult } from './report.service';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Paga',
  RECEIVED: 'Recebida',
  CANCELLED: 'Cancelada',
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: 'Helvetica' },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4, color: '#0B3B36' },
  subtitle: { fontSize: 10, color: '#5A6B68', marginBottom: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  summaryCard: {
    borderWidth: 1,
    borderColor: '#E2E8E6',
    borderRadius: 4,
    padding: 8,
    width: '23%',
  },
  summaryLabel: { fontSize: 8, color: '#5A6B68', marginBottom: 2 },
  summaryValue: { fontSize: 12, fontWeight: 700, color: '#0B3B36' },
  monthHeader: {
    fontSize: 12,
    fontWeight: 700,
    backgroundColor: '#F1F5F4',
    padding: 6,
    marginTop: 12,
    color: '#0B3B36',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#0B3B36',
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8E6',
    paddingVertical: 4,
  },
  colDate: { width: '12%' },
  colDescription: { width: '30%' },
  colCategory: { width: '20%' },
  colStatus: { width: '15%' },
  colAmount: { width: '23%', textAlign: 'right' },
  headerCell: { fontWeight: 700, fontSize: 9 },
  footer: { position: 'absolute', bottom: 20, left: 32, right: 32, fontSize: 8, color: '#9CA8A5' },
});

interface ReportDocumentProps {
  result: ReportResult;
  filterSummary: ReportFilterSummary;
}

function ReportDocument({ result, filterSummary }: ReportDocumentProps): React.ReactElement {
  const filterParts = [
    filterSummary.categoryLabel ? `Categoria: ${filterSummary.categoryLabel}` : null,
    filterSummary.accountLabel ? `Conta: ${filterSummary.accountLabel}` : null,
    filterSummary.tagLabel ? `Tag: ${filterSummary.tagLabel}` : null,
    filterSummary.statusLabel ? `Status: ${filterSummary.statusLabel}` : null,
    filterSummary.natureLabel ? `Natureza: ${filterSummary.natureLabel}` : null,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Relatório VortCon</Text>
        <Text style={styles.subtitle}>
          {filterSummary.periodLabel}
          {filterParts.length > 0 ? ` — ${filterParts.join(' · ')}` : ''}
        </Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Receitas</Text>
            <Text style={styles.summaryValue}>
              {currencyFormatter.format(result.totalIncomeCents / 100)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Despesas</Text>
            <Text style={styles.summaryValue}>
              {currencyFormatter.format(result.totalExpenseCents / 100)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Resultado</Text>
            <Text style={styles.summaryValue}>
              {currencyFormatter.format(result.totalResultCents / 100)}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Saldo geral (atual)</Text>
            <Text style={styles.summaryValue}>
              {currencyFormatter.format(result.currentRealBalanceCents / 100)}
            </Text>
          </View>
        </View>

        {result.categorySummary ? (
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
              Categoria: {result.categorySummary.categoryName}
            </Text>
            <Text style={{ fontSize: 9, color: '#5A6B68' }}>
              Receitas {currencyFormatter.format(result.categorySummary.incomeCents / 100)} (
              {result.categorySummary.incomeCount}) · Despesas{' '}
              {currencyFormatter.format(result.categorySummary.expenseCents / 100)} (
              {result.categorySummary.expenseCount}) · Resultado líquido{' '}
              {currencyFormatter.format(result.categorySummary.netResultCents / 100)}
            </Text>
          </View>
        ) : null}

        {result.months.map((month) => (
          <View key={month.monthKey} wrap={false}>
            <Text style={styles.monthHeader}>
              {month.monthLabel} — Receitas {currencyFormatter.format(month.incomeCents / 100)} ·
              Despesas {currencyFormatter.format(month.expenseCents / 100)} · Resultado{' '}
              {currencyFormatter.format(month.resultCents / 100)}
            </Text>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.colDate, styles.headerCell]}>Data</Text>
              <Text style={[styles.colDescription, styles.headerCell]}>Descrição</Text>
              <Text style={[styles.colCategory, styles.headerCell]}>Categoria</Text>
              <Text style={[styles.colStatus, styles.headerCell]}>Status</Text>
              <Text style={[styles.colAmount, styles.headerCell]}>Valor</Text>
            </View>
            {month.movements.map((movement) => (
              <View key={movement.id} style={styles.tableRow}>
                <Text style={styles.colDate}>
                  {dateFormatter.format(new Date(movement.dueDate))}
                </Text>
                <Text style={styles.colDescription}>{movement.description}</Text>
                <Text style={styles.colCategory}>{movement.categoryName ?? '—'}</Text>
                <Text style={styles.colStatus}>
                  {STATUS_LABEL[movement.status] ?? movement.status}
                </Text>
                <Text style={styles.colAmount}>
                  {movement.type === 'EXPENSE' ? '- ' : '+ '}
                  {currencyFormatter.format(movement.amountCents / 100)}
                </Text>
              </View>
            ))}
          </View>
        ))}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

/**
 * PDF do relatório (Seção 100): template dedicado (layout próprio,
 * construído com componentes @react-pdf/renderer), nunca captura de tela
 * — reflete exatamente os filtros aplicados na consulta.
 */
export async function buildReportPdf(
  result: ReportResult,
  filterSummary: ReportFilterSummary,
): Promise<Buffer> {
  return renderToBuffer(<ReportDocument result={result} filterSummary={filterSummary} />);
}
