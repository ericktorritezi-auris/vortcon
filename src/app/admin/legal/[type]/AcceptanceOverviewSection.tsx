import type {
  AcceptanceHistoryRow,
  AcceptanceOverviewRow,
} from '@/modules/legal/legal-acceptance.service';
import { Badge } from '@/shared/ui';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

interface AcceptanceOverviewSectionProps {
  overview: AcceptanceOverviewRow[];
  history: AcceptanceHistoryRow[];
}

/**
 * Seção 137 (Admin — Aceites): consultar documentos, versões, regularizados,
 * pendentes, histórico, timestamps. Somente leitura — nenhum botão de editar
 * ou apagar aceite existe aqui, de propósito ("Não editar aceite registrado").
 */
export function AcceptanceOverviewSection({
  overview,
  history,
}: AcceptanceOverviewSectionProps): React.ReactElement {
  const regularizedCount = overview.filter((row) => row.status === 'REGULARIZADO').length;

  return (
    <div className="mt-10 flex flex-col gap-6 border-t border-ink-secondary/10 pt-8">
      <div>
        <h2 className="mb-1 text-base font-semibold text-ink-primary">Aceites</h2>
        <p className="text-xs text-ink-secondary">
          {regularizedCount} de {overview.length} tenants regularizados com a versão publicada
          atual.
        </p>
      </div>

      <div className="flex flex-col divide-y divide-ink-secondary/10 rounded-lg border border-ink-secondary/15 bg-white">
        {overview.map((row) => (
          <div key={row.userId} className="flex items-center justify-between px-4 py-2.5 text-sm">
            <div>
              <p className="font-medium text-ink-primary">{row.userName}</p>
              <p className="text-xs text-ink-secondary">{row.userEmail}</p>
            </div>
            <div className="flex items-center gap-3">
              {row.acceptedAt ? (
                <span className="text-xs text-ink-secondary">
                  {dateFormatter.format(row.acceptedAt)}
                </span>
              ) : null}
              <Badge tone={row.status === 'REGULARIZADO' ? 'success' : 'warning'}>
                {row.status === 'REGULARIZADO' ? 'Regularizado' : 'Pendente'}
              </Badge>
            </div>
          </div>
        ))}
        {overview.length === 0 ? (
          <p className="px-4 py-3 text-sm text-ink-secondary">Nenhum tenant cadastrado ainda.</p>
        ) : null}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-ink-primary">Histórico completo</h3>
        <div className="flex flex-col divide-y divide-ink-secondary/10 rounded-lg border border-ink-secondary/15 bg-white">
          {history.map((row, index) => (
            // eslint-disable-next-line react/no-array-index-key -- linha de historico somente-leitura, sem id proprio exposto
            <div
              key={`${row.userEmail}-${index}`}
              className="flex items-center justify-between px-4 py-2 text-xs"
            >
              <span className="text-ink-primary">{row.userName}</span>
              <span className="text-ink-secondary">versão {row.version}</span>
              <span className="text-ink-secondary">{dateFormatter.format(row.acceptedAt)}</span>
              <span className="text-ink-secondary">{row.ipAddress ?? '—'}</span>
            </div>
          ))}
          {history.length === 0 ? (
            <p className="px-4 py-3 text-sm text-ink-secondary">Nenhum aceite registrado ainda.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
