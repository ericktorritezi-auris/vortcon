// Service worker mínimo (Seção 121 — Push). Só o necessário para receber
// push e abrir o deep link ao clicar. Nenhuma estratégia de cache aqui —
// isso é o Estágio 14 (PWA), que também vai adicionar manifest e
// instalabilidade a este mesmo arquivo. Seção 139: nunca cachear conteúdo
// privado inseguramente — por isso, propositalmente, nada é cacheado ainda.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'VortCon', {
      body: payload.body || '',
      icon: '/icons/apple-touch-icon.png',
      data: { deepLink: payload.deepLink || '/app' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const deepLink =
    event.notification.data && event.notification.data.deepLink
      ? event.notification.data.deepLink
      : '/app';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(deepLink) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(deepLink);
      }
      return undefined;
    }),
  );
});
