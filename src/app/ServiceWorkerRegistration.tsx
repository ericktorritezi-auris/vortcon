'use client';

import { useEffect } from 'react';

/**
 * Registra o service worker no carregamento do app (Seção 138) —
 * independente de push (Estágio 13 registrava só quando a pessoa ativava
 * notificações). Sem isso, o navegador não considera o site instalável:
 * o prompt "Adicionar à tela inicial" no Android/Chrome exige um service
 * worker ativo, não só o manifest.
 */
export function ServiceWorkerRegistration(): null {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => {
        console.error('[pwa] Falha ao registrar o service worker:', error);
      });
    }
  }, []);

  return null;
}
