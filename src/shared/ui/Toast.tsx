'use client';

import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useState } from 'react';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON: Record<ToastTone, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

const TONE_CLASSES: Record<ToastTone, string> = {
  success: 'border-financial-success/30 text-[#178a44]',
  error: 'border-financial-danger/30 text-financial-danger',
  info: 'border-brand-intelligence/30 text-brand-intelligence',
};

const AUTO_DISMISS_MS = 5000;

/**
 * Provider de Toast (Seção 14). Envolve o app uma vez no layout raiz.
 * Região com `aria-live="polite"` para leitores de tela anunciarem a
 * mensagem sem interromper o que o usuário está fazendo (Seção 12).
 */
export function ToastProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, tone: ToastTone = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  function dismiss(id: string): void {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2"
      >
        {toasts.map((toast) => {
          const Icon = TONE_ICON[toast.tone];
          return (
            <div
              key={toast.id}
              className={[
                'flex items-start gap-2 rounded-md border bg-white px-4 py-3 shadow-lg',
                TONE_CLASSES[toast.tone],
              ].join(' ')}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <p className="flex-1 text-sm text-ink-primary">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Fechar notificação"
                className="text-ink-secondary hover:text-ink-primary"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser usado dentro de <ToastProvider>');
  }
  return context;
}
