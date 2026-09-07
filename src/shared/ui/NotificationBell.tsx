'use client';

import { Bell, BellRing } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  deepLink: string | null;
  readAt: string | null;
  createdAt: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * Central de Notificações (Seção 120): sino, badge, read/unread, deep
 * links contextuais. Push (Seção 121) é opt-in explícito — o botão só
 * aparece aqui, dentro do app já logado, nunca na landing pública.
 */
export function NotificationBell(): React.ReactElement {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [pushLoading, setPushLoading] = useState(false);

  async function loadNotifications(): Promise<void> {
    const response = await fetch('/api/notifications');
    if (!response.ok) return;
    const data = (await response.json()) as {
      notifications: NotificationItem[];
      unreadCount: number;
    };
    setNotifications(data.notifications);
    setUnreadCount(data.unreadCount);
  }

  useEffect(() => {
    void loadNotifications();
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready
        .then((registration) => registration.pushManager.getSubscription())
        .then((subscription) => setPushEnabled(Boolean(subscription)))
        .catch(() => setPushEnabled(false));
    } else {
      setPushEnabled(false);
    }
  }, []);

  async function handleOpen(): Promise<void> {
    setOpen((prev) => !prev);
    if (!open) await loadNotifications();
  }

  async function handleNotificationClick(notification: NotificationItem): Promise<void> {
    if (!notification.readAt) {
      await fetch(`/api/notifications/${notification.id}/read`, { method: 'POST' });
    }
    setOpen(false);
    if (notification.deepLink) {
      router.push(notification.deepLink);
    }
    void loadNotifications();
  }

  async function handleMarkAllRead(): Promise<void> {
    await fetch('/api/notifications/read-all', { method: 'POST' });
    void loadNotifications();
  }

  async function handleEnablePush(): Promise<void> {
    setPushLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const keyResponse = await fetch('/api/push/vapid-public-key');
      if (!keyResponse.ok) return;
      const { publicKey } = (await keyResponse.json()) as { publicKey: string };

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const subscriptionJson = subscription.toJSON();
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: subscriptionJson.endpoint, keys: subscriptionJson.keys }),
      });

      setPushEnabled(true);
    } catch (error) {
      console.error('[push] Falha ao ativar:', error);
    } finally {
      setPushLoading(false);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => void handleOpen()}
        aria-label={unreadCount > 0 ? `Notificações — ${unreadCount} não lidas` : 'Notificações'}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-md text-ink-secondary hover:bg-surface-page"
      >
        {unreadCount > 0 ? (
          <BellRing className="h-5 w-5 text-brand-flow" aria-hidden="true" />
        ) : (
          <Bell className="h-5 w-5" aria-hidden="true" />
        )}
        {unreadCount > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-financial-danger px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-20 mt-1 w-80 max-w-[90vw] rounded-md border border-ink-secondary/15 bg-white py-1 shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-ink-secondary/10 px-3 py-2">
            <span className="text-sm font-semibold text-ink-primary">Notificações</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={() => void handleMarkAllRead()}
                className="text-xs font-medium text-brand-flow hover:underline"
              >
                Marcar todas como lidas
              </button>
            ) : null}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => void handleNotificationClick(notification)}
                className={[
                  'flex w-full flex-col gap-0.5 border-b border-ink-secondary/5 px-3 py-2.5 text-left hover:bg-surface-page',
                  notification.readAt ? '' : 'bg-brand-flow/5',
                ].join(' ')}
              >
                <span className="text-sm font-medium text-ink-primary">{notification.title}</span>
                <span className="text-xs text-ink-secondary">{notification.body}</span>
                <span className="text-[10px] text-ink-secondary/70">
                  {dateFormatter.format(new Date(notification.createdAt))}
                </span>
              </button>
            ))}
            {notifications.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-ink-secondary">
                Nenhuma notificação ainda.
              </p>
            ) : null}
          </div>

          {pushEnabled === false ? (
            <div className="border-t border-ink-secondary/10 px-3 py-2.5">
              <button
                type="button"
                onClick={() => void handleEnablePush()}
                disabled={pushLoading}
                className="w-full rounded-md bg-surface-page px-3 py-2 text-left text-xs font-medium text-ink-primary hover:bg-ink-secondary/10 disabled:opacity-60"
              >
                {pushLoading ? 'Ativando...' : 'Ativar notificações push neste dispositivo'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
