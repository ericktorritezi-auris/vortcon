import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

/**
 * Estado de erro (Seção 206). Mensagem explica o que houve e como agir, na
 * voz da interface — nunca expõe stack trace ou mensagem técnica crua.
 */
export function ErrorState({
  title = 'Algo deu errado',
  description = 'Não foi possível carregar essas informações agora.',
  onRetry,
}: ErrorStateProps): React.ReactElement {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-lg border border-financial-danger/20 bg-financial-danger/5 px-6 py-10 text-center"
    >
      <AlertTriangle className="h-7 w-7 text-financial-danger" aria-hidden="true" />
      <p className="text-sm font-semibold text-ink-primary">{title}</p>
      <p className="max-w-sm text-sm text-ink-secondary">{description}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
          Tentar novamente
        </Button>
      ) : null}
    </div>
  );
}
