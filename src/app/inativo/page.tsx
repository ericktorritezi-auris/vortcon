import { Archive } from 'lucide-react';
import { Footer } from '@/shared/ui';

export default function InactiveTenantPage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <Archive className="h-10 w-10 text-ink-secondary" aria-hidden="true" />
        <h1 className="text-2xl font-semibold text-ink-primary">Conta encerrada</h1>
        <p className="max-w-md text-sm text-ink-secondary">
          Esta conta foi encerrada. Seus dados continuam preservados. Entre em contato com o suporte
          se quiser reativá-la.
        </p>
      </main>
      <Footer />
    </div>
  );
}
