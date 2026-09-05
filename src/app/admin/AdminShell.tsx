import Link from 'next/link';
import { VortConMark } from '@/shared/design-system/Logo';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/tenants', label: 'Tenants' },
  { href: '/admin/plans', label: 'Planos' },
  { href: '/admin/legal', label: 'Legal' },
];

export function AdminShell({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="min-h-screen bg-surface-page">
      <header className="border-b border-ink-secondary/10 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-8">
          <div className="flex items-center gap-2">
            <VortConMark size={22} />
            <span className="text-sm font-bold text-brand-deep">Admin</span>
          </div>
          <nav className="flex gap-5 text-sm text-ink-secondary">
            {NAV_ITEMS.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-brand-deep">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
