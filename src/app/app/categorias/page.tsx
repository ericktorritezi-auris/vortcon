import { redirect } from 'next/navigation';
import type { Category } from '@prisma/client';
import { evaluateAccessPolicy } from '@/modules/auth/access-policy.service';
import { listCategories } from '@/modules/categories/category.service';
import { AppShell } from '../AppShell';
import { CategoriesManager } from './CategoriesManager';

export const dynamic = 'force-dynamic';

export default async function CategoriasPage(): Promise<React.ReactElement> {
  const access = await evaluateAccessPolicy();

  switch (access.kind) {
    case 'UNAUTHENTICATED':
      redirect('/entrar');
    case 'WRONG_AREA_FOR_ADMIN':
      redirect('/admin');
    case 'TENANT_INACTIVE':
      redirect('/inativo');
    case 'DELINQUENCY_BLOCKED':
    case 'ADMIN_BLOCKED':
    case 'SECURITY_BLOCKED':
      redirect('/bloqueado');
    case 'LEGAL_ACCEPTANCE_REQUIRED':
      redirect('/aceitar-termos');
    case 'ALLOWED':
      break;
  }

  const categories = await listCategories(access.context.tenantId);

  return (
    <AppShell>
      <h1 className="mb-6 text-xl font-semibold text-ink-primary">Categorias</h1>
      <CategoriesManager
        categories={categories.map((category: Category) => ({
          id: category.id,
          name: category.name,
          iconKey: category.iconKey,
        }))}
      />
    </AppShell>
  );
}
