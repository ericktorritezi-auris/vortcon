# Módulo: notifications

Central de Notificações, push e outbox (Seção 116-126).

## Implementado (Estágio 13)

- `notification.service.ts` — canal interna (Seção 116, 120): criar, listar (com
  contagem de não lidas), marcar como lida/todas como lidas.
- `notification-suppression.ts` — supressão pura (Seção 118): nunca notificar se
  paga/recebida/cancelada/ignorada. Testada isoladamente (5 testes) e validada de
  novo com Postgres real: uma transação marcada como paga antes do job rodar nunca
  gera notificação, mesmo com `reminderEnabled=true`.
- `push.service.ts` — opt-in explícito (Seção 121), multi-dispositivo, usando
  `web-push`/VAPID (já configurado desde o Estágio 6). Inscrição expirada (404/410)
  é removida silenciosamente. Corpo da mensagem sempre discreto (Seção 122) — nunca
  valores em reais no push.
- `outbox.service.ts` — Transactional Outbox simplificado (Seção 126). Conectado à
  transação real de "marcar mensalidade como paga" (`subscription.repository.ts`):
  o evento `SubscriptionChargePaid` é gravado na MESMA transação do UPDATE — nunca
  se perde mesmo se o processo cair logo após o commit. Falha de e-mail nunca desfaz
  o pagamento (Seção 124).
- 5 templates de e-mail novos em `shared/email/resend.ts`: assinatura próxima,
  pendência, confirmação, bloqueio, desbloqueio.
- `NotificationBell.tsx` (UI) — sino, badge, dropdown com read/unread e deep links,
  mais o botão de opt-in de push. Substituiu o botão desabilitado que existia desde
  a reestruturação de UX.
- Service worker mínimo (`public/sw.js`) — só o necessário para receber push e abrir
  o deep link ao clicar. Sem estratégia de cache (Seção 139) — o Estágio 14 (PWA)
  expande este mesmo arquivo para instalabilidade completa.
