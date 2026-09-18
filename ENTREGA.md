# VortCon — Patch: correção do Prettier (format:check) — segue v1.6.0

## CAUSA RAIZ (achei e confirmei, não é suposição)

É consequência direta do dark mode, não um problema pré-existente — corrijo
o que eu disse na entrega anterior sobre isso.

O `prettier-plugin-tailwindcss` calcula a ordem "canônica" das classes de
cada `className` resolvendo o `tailwind.config.ts` do projeto. Na entrega
anterior, troquei as cores de `brand`/`surface`/`ink`/`financial` de hex
fixo (`'#123B46'`) para referência de CSS variable (`'var(--vc-deep)'`) —
é exatamente isso que possibilita o dark mode (a mesma classe Tailwind
passa a apontar pra uma cor diferente conforme o tema). Só que o plugin
resolve essas cores internamente pra decidir a ordem de sort, e uma cor
como `var(...)` é tratada de forma diferente de um hex literal nesse
cálculo — o que muda a ordem esperada das classes **em todo o projeto**,
não só nos arquivos que eu editei.

Confirmei isolando a variável: com o `tailwind.config.ts` original (hex
fixo), o Prettier aprova arquivos como `Checkbox.tsx` (que eu nunca
toquei); só com a troca pra `var(--vc-*)` é que ele passa a exigir a nova
ordem. `darkMode: 'class'`, sozinho, não causa isso.

## O QUE MUDOU NESTE PATCH

Reformatação pura de `className` (ordem das classes Tailwind) em 51
arquivos — **nenhuma mudança de lógica, comportamento ou texto**. A ordem
das classes dentro de um `className` nunca afeta o resultado visual (é só
convenção de leitura/lint), então isso é 100% seguro.

Rodei `npx prettier --write .` no projeto inteiro (não só nesses 51) pra
garantir que fica tudo consistente com a nova ordem de uma vez só, e
comparei cada arquivo resultante contra o original — confirmando que a
única diferença em cada um é a ordem das classes dentro da mesma string
(nenhuma classe foi adicionada, removida ou trocada).

## ARQUIVOS NESTE PATCH (51, todos alterações — nenhum novo, nenhum removido)

- 30 são arquivos que eu já tinha te entregado na v1.6.0 (dark mode) e que
  precisavam de mais um ajuste de ordem além do que eu já tinha corrigido.
- 21 são arquivos que eu nunca tinha tocado antes (não fazem parte do
  dark mode) — só entram aqui porque a nova ordem de classes os afeta
  também.

Lista completa:

```
src/app/admin/factory-reset/page.tsx
src/app/admin/legal/[type]/AcceptanceOverviewSection.tsx
src/app/admin/legal/[type]/LegalEditor.tsx
src/app/admin/legal/page.tsx
src/app/admin/page.tsx
src/app/admin/plans/PlansManager.tsx
src/app/admin/tenants/CreateTenantForm.tsx
src/app/admin/tenants/[id]/BackupRestore.tsx
src/app/admin/tenants/[id]/page.tsx
src/app/admin/tenants/page.tsx
src/app/app/OnboardingChecklistCard.tsx
src/app/app/assinatura/page.tsx
src/app/app/categorias/CategoriesManager.tsx
src/app/app/cockpit/CockpitView.tsx
src/app/app/contas/AccountsManager.tsx
src/app/app/page.tsx
src/app/app/perfil/ProfileView.tsx
src/app/app/programacoes/beneficiarios/BeneficiariesManager.tsx
src/app/app/programacoes/lancamentos/EntriesView.tsx
src/app/app/programacoes/origens/OriginsManager.tsx
src/app/app/programacoes/recorrencias/ProgrammingRecurrenceManager.tsx
src/app/app/recorrencias/RecorrenciasManager.tsx
src/app/app/relatorios/ReportsView.tsx
src/app/app/tags/TagsManager.tsx
src/app/app/transacoes/TransactionDetailDrawer.tsx
src/app/app/transacoes/TransactionsView.tsx
src/app/app/transferencias/TransferDetailDrawer.tsx
src/app/app/transferencias/TransfersView.tsx
src/app/entrar/page.tsx
src/app/funcionalidades/page.tsx
src/app/page.tsx
src/app/planos/page.tsx
src/app/produto/page.tsx
src/shared/marketing/ProductMockups.tsx
src/shared/recurrence/RecurrenceFields.tsx
src/shared/recurrence/SeriesModeRadios.tsx
src/shared/ui/AcceptanceContextBanner.tsx
src/shared/ui/AppSidebar.tsx
src/shared/ui/AuthCardLayout.tsx
src/shared/ui/Checkbox.tsx
src/shared/ui/Drawer.tsx
src/shared/ui/EmptyState.tsx
src/shared/ui/ErrorState.tsx
src/shared/ui/Footer.tsx
src/shared/ui/IconPicker.tsx
src/shared/ui/MetricCard.tsx
src/shared/ui/Modal.tsx
src/shared/ui/NotificationBell.tsx
src/shared/ui/SearchableSelect.tsx
src/shared/ui/Skeleton.tsx
src/shared/ui/TagPicker.tsx
```

Exatamente a mesma lista que apareceu no seu log do GitHub Actions.

## MIGRATIONS

Nenhuma.

## QA EXECUTADO

- `npx prettier --write .` no projeto inteiro, seguido de `npx prettier
  --check .` — ✅ limpo, 100% do projeto.
- `npm run lint` — ✅ limpo (0 erros, 0 warnings).
- `typecheck`/`test`/`build` completos continuam com a mesma limitação de
  rede do sandbox já explicada na entrega anterior (bloqueio a
  `binaries.prisma.sh`) — não é afetado por este patch, que é só
  formatação. Deixe o GitHub Actions confirmar como sempre.

## POR QUE ISSO NÃO SE REPETE

Esse é um efeito de uma única vez: a ordem "nova" já está aplicada em
todo o projeto agora. Qualquer edição futura, sua ou minha, vai ser
formatada contra essa mesma ordem — não vai voltar a divergir por causa
disso.
