// Service worker (Seção 138-139 — PWA). Expandido a partir da versão
// mínima do Estágio 13, que só cobria push.
//
// Estratégia de cache (Seção 139 — "não offline-first", "nunca cachear
// conteúdo privado inseguramente"):
// - SÓ os arquivos estáticos e públicos listados em PRECACHE_URLS são
//   cacheados (ícones, manifest) — nada com dado financeiro, nunca uma
//   página HTML, nunca uma resposta de API.
// - Toda outra requisição (páginas, /api/*) passa direto pro navegador
//   tratar normalmente — o service worker nem intercepta. Não existe
//   banco financeiro offline aqui, de propósito.
// - skipWaiting/clients.claim garantem que uma atualização deste arquivo
//   assume imediatamente, sem exigir fechar todas as abas.

const CACHE_NAME = 'vortcon-static-v1';
const PRECACHE_URLS = [
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-16.png',
  '/icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'GET' && PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request)));
  }
});

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
