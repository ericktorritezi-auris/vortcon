'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { VortConMark } from '@/shared/design-system/Logo';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/tenants', label: 'Tenants' },
  { href: '/admin/plans', label: 'Planos' },
  { href: '/admin/legal', label: 'Legal' },
];

export function AdminShell({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout(): Promise<void> {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/entrar');
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-surface-page">
      <header className="border-b border-ink-secondary/10 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center gap-8">
          <div className="flex items-center gap-2">
            <VortConMark size={22} />
            <span className="text-sm font-bold text-brand-deep">Admin</span>
          </div>
          <nav className="flex flex-1 gap-5 text-sm text-ink-secondary">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? 'page' : undefined}
                className={
                  pathname === item.href ? 'font-medium text-brand-deep' : 'hover:text-brand-deep'
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-ink-secondary hover:text-financial-danger"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sair
          </button>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
