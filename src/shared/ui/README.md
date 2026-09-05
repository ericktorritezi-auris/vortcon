# Shared: ui

Componentes de UI puros e reutilizáveis do Design System (Master Document, Seção 14).
Todo estilo consome os tokens Tailwind definidos a partir da Seção 7-9 — nada de cor,
espaçamento ou raio hardcoded fora daqui.

## Implementados (Estágio 2)

Button · Input · MoneyInput · DateInput · Select · SearchableSelect · IconPicker ·
TagPicker · Toggle · Checkbox · Badge · MetricCard · FinancialValue · Modal · Drawer ·
Toast (`ToastProvider`/`useToast`) · Pagination · EmptyState · ErrorState · Skeleton ·
Header · Sidebar · MobileMenu · Footer

Import via barrel: `import { Button, MetricCard } from '@/shared/ui'`.

## Deliberadamente adiados

Estes componentes da lista da Seção 14 têm formato atrelado a uma entidade de domínio
que ainda não existe — construí-los agora seria adivinhar a forma dos dados e
provavelmente refazer depois. Entram junto do módulo que os torna reais:

- `AccountCard` — Estágio 7 (Domínio Financeiro / `accounts`)
- `TransactionRow`, `DayTransactionGroup` — Estágio 9 (Transações)
- `InsightCard` — Estágio 11 (Cockpit/Insights)
- `OnboardingCard` — Estágio 10 (Dashboard/Onboarding)
- `SubscriptionCard` — Estágio 6 (Admin/Comercial)
- `ReportCard` — Estágio 12 (Relatórios)
- `NotificationCenter` — Estágio 13 (Notificações)
