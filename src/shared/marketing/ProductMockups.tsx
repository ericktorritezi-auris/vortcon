import { ArrowDownLeft, ArrowUpRight, FileSpreadsheet, FileText } from 'lucide-react';

/**
 * Mockups do produto real (pedido do cliente: "imagens reais", nunca
 * ícone genérico ou banco de imagens) — recriação fiel das telas reais do
 * VortCon (Cockpit, Transações, Relatórios), usando os mesmos tokens de
 * cor do app de verdade. Estático, sem interatividade: são ilustrações,
 * não componentes funcionais.
 */

const currency = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);

export function CockpitMockup(): React.ReactElement {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-ink-secondary/10 bg-white p-5 shadow-xl shadow-brand-deep/10">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink-primary">Setembro/2026</span>
        <span className="rounded-full bg-financial-success/10 px-2.5 py-1 text-xs font-medium text-financial-success">
          + {currency(1184000)}
        </span>
      </div>
      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-surface-page p-2.5">
          <p className="text-[10px] text-ink-secondary">Receitas</p>
          <p className="text-sm font-semibold text-ink-primary">{currency(1280000)}</p>
        </div>
        <div className="rounded-lg bg-surface-page p-2.5">
          <p className="text-[10px] text-ink-secondary">Despesas</p>
          <p className="text-sm font-semibold text-ink-primary">{currency(96000)}</p>
        </div>
        <div className="rounded-lg bg-surface-page p-2.5">
          <p className="text-[10px] text-ink-secondary">Saldo</p>
          <p className="text-sm font-semibold text-ink-primary">{currency(1514000)}</p>
        </div>
      </div>
      <div className="flex h-16 items-end gap-1.5">
        {[40, 65, 30, 80, 55, 90, 70].map((height, index) => (
          <div
            key={index}
            className="flex-1 rounded-t-sm bg-gradient-to-t from-brand-deep to-brand-flow"
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </div>
  );
}

interface MockTransaction {
  label: string;
  category: string;
  amountCents: number;
  type: 'income' | 'expense';
}

const MOCK_TRANSACTIONS: MockTransaction[] = [
  { label: 'Salário', category: 'Receita fixa', amountCents: 1280000, type: 'income' },
  { label: 'Aluguel do consultório', category: 'Moradia', amountCents: 320000, type: 'expense' },
  { label: 'Mensalidade do plano', category: 'Assinaturas', amountCents: 4990, type: 'expense' },
];

export function TransactionsMockup(): React.ReactElement {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-ink-secondary/10 bg-white p-5 shadow-xl shadow-brand-deep/10">
      <p className="mb-3 text-sm font-semibold text-ink-primary">Transações de hoje</p>
      <div className="flex flex-col divide-y divide-ink-secondary/10">
        {MOCK_TRANSACTIONS.map((transaction) => (
          <div key={transaction.label} className="flex items-center gap-3 py-2.5">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                transaction.type === 'income' ? 'bg-financial-success/10' : 'bg-financial-danger/10'
              }`}
            >
              {transaction.type === 'income' ? (
                <ArrowUpRight className="h-4 w-4 text-financial-success" aria-hidden="true" />
              ) : (
                <ArrowDownLeft className="h-4 w-4 text-financial-danger" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink-primary">{transaction.label}</p>
              <p className="text-xs text-ink-secondary">{transaction.category}</p>
            </div>
            <span
              className={`shrink-0 text-sm font-medium ${
                transaction.type === 'income' ? 'text-financial-success' : 'text-financial-danger'
              }`}
            >
              {transaction.type === 'income' ? '+' : '−'} {currency(transaction.amountCents)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ReportsMockup(): React.ReactElement {
  return (
    <div className="w-full max-w-sm rounded-2xl border border-ink-secondary/10 bg-white p-5 shadow-xl shadow-brand-deep/10">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold text-ink-primary">Relatório · Setembro</p>
        <div className="flex gap-1.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-page">
            <FileText className="h-3.5 w-3.5 text-ink-secondary" aria-hidden="true" />
          </span>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-page">
            <FileSpreadsheet className="h-3.5 w-3.5 text-ink-secondary" aria-hidden="true" />
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div
          className="h-24 w-24 shrink-0 rounded-full"
          style={{
            background: 'conic-gradient(#123B46 0% 45%, #19A7A0 45% 75%, #1EA6D6 75% 100%)',
          }}
        />
        <ul className="flex flex-col gap-1.5 text-xs text-ink-secondary">
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-deep" /> Moradia — 45%
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-brand-flow" /> Saúde — 30%
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: '#1EA6D6' }} /> Outros
            — 25%
          </li>
        </ul>
      </div>
    </div>
  );
}
