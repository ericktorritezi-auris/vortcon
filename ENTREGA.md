# VortCon — Entrega: Dark Mode (toggle claro/escuro)

## VERSÃO

`1.5.1` → `1.6.0`

Atualizada nos 4 locais rastreados: `package.json`, `src/modules/backup/backup.service.ts`
(`VORTCON_VERSION`), `src/shared/ui/Footer.tsx` (`APP_VERSION`), `src/app/api/health/route.ts`
(`version`, nos dois branches do healthcheck).

## ARQUIVOS NOVOS (6)

- `prisma/migrations/20260918160000_theme_preference/migration.sql`
- `src/modules/theme/theme.constants.ts`
- `src/modules/theme/theme.service.ts`
- `src/shared/theme/ThemeToggle.tsx`
- `src/app/api/profile/theme/route.ts`
- `tests/unit/theme.test.ts`

## ARQUIVOS ALTERADOS (56)

Versionamento e documentação: `package.json`, `CHANGELOG.md`, `README.md`,
`prisma/schema.prisma` (novo enum `ThemePreference` + campo
`User.themePreference`, default `LIGHT`).

Arquitetura de cor: `tailwind.config.ts` (cores agora apontam pras CSS
variables em vez de hex fixo, `darkMode: 'class'`), `src/app/globals.css`
(variáveis de superfície/texto/contraste redefinidas sob `.dark`).

Shell autenticado e toggle: `src/app/app/AppShell.tsx`, `src/app/admin/AdminShell.tsx`
(aplicam a classe `.dark` no elemento-raiz, lida do cookie no servidor),
`src/shared/ui/Topbar.tsx` (novo item no dropdown do avatar).

Sincronização de tema no login: `src/app/api/auth/login/route.ts`,
`src/app/api/auth/accept-invite/route.ts`, `src/app/api/webauthn/login/verify/route.ts`.

Ajuda: `src/app/app/ajuda/HelpContent.tsx` (nova seção "Tema claro/escuro").

Todo o restante (`src/shared/ui/*`, `src/app/app/**`, `src/app/admin/**`) —
troca mecânica de `bg-white` cru por `bg-surface-card` (o mesmo branco hoje,
mas que passa a acompanhar o tema), e das cores de texto dos badges/toast/
valores financeiros (`text-[#178a44]` etc.) pelos novos tokens
`financial.successText/dangerText/warningText/infoText`, para ficarem
legíveis também no escuro.

## ARQUIVOS REMOVIDOS

Nenhum.

## MIGRATIONS

`20260918160000_theme_preference` — adiciona o enum `ThemePreference`
(`LIGHT`/`DARK`) e a coluna `users.themePreference` (`NOT NULL DEFAULT 'LIGHT'`).
Aditiva, sem backfill necessário, sem risco a dados existentes — toda conta
já existente permanece exatamente como está até a pessoa tocar no toggle.

## DECISÕES TOMADAS NESTA ENTREGA

1. **Posicionamento do toggle**: dropdown do avatar (Topbar), ao lado da
   Calculadora — não no menu lateral, como sugerido inicialmente. Motivo:
   tema é preferência de conta, não navegação; e o sidebar exigiria
   implementar em dois lugares (desktop + overlay mobile). Aprovado por
   você antes de eu começar a construir.
2. **Escopo do dark mode**: aplicado só dentro da área logada
   (`AppShell`/`AdminShell`), nunca no `<html>` inteiro. O site
   institucional, páginas legais e a tela de login nunca herdam o tema
   escuro — isso elimina o risco de "vazamento" visual pra páginas que
   não foram desenhadas/revisadas para o tema escuro.
3. **Cores de marca e semáforos financeiros são constantes** nos dois
   temas (Seção 12: "vermelho é despesa" nunca muda de significado). Só
   fundo/texto e as variantes de contraste dos semáforos mudam.
4. **Persistência em banco, não só cookie/localStorage** — a preferência
   acompanha a pessoa entre dispositivos, sincronizada nos três pontos de
   login.

## TESTES EXECUTADOS

- `npm run lint` — ✅ limpo (0 erros, 0 warnings), em todo o projeto.
- `npx prettier --check` — ✅ limpo em todos os 62 arquivos desta entrega
  (4 arquivos precisaram de `--write` durante o desenvolvimento: `README.md`,
  `HelpContent.tsx`, `globals.css`, `Topbar.tsx` — já corrigidos e
  incluídos aqui formatados).
- `npm run typecheck`, `npm run test`, `npm run build` — **não foi possível
  rodar de ponta a ponta neste sandbox local**, pelo mesmo motivo já
  registrado no README desde o Estágio 1: este ambiente bloqueia
  `binaries.prisma.sh` (necessário pro `prisma generate` baixar o engine
  real) e, para build de produção, também `fonts.googleapis.com`. Sem o
  engine real, o `@prisma/client` fica com tipos genéricos (`any`), e todo
  o projeto — não só este código novo — falha o `typecheck` com o mesmo
  erro (`Module '@prisma/client' has no exported member 'X'`) para
  qualquer model/enum do schema, incluindo os que já existiam antes desta
  entrega. Confirmei isso tentando: variável de ignorar checksum, engine
  em modo WASM (bundlado, sem rede) e um fetch direto — os três bloqueados
  pela mesma política de rede do sandbox.
  **Isso não afeta o GitHub Actions nem o Railway**, que têm acesso
  irrestrito a ambos os domínios (é a mesma ressalva que já está no seu
  próprio README, Estágio 1). Recomendo deixar o CI real confirmar
  `typecheck`/`test`/`build` antes do merge, como sempre.
- `tests/unit/theme.test.ts` — cobre a conversão pura entre o enum de
  banco e o valor de cookie/DOM (`toThemeValue`/`toThemePreference`) e a
  validação do cookie (`isThemeValue`). As funções que persistem tema
  (`syncThemeCookieFromUser`, `updateThemePreference`) não têm teste
  direto pela mesma razão documentada em
  `tests/integration/multitenant-isolation-extended.test.ts` para
  `evaluateAccessPolicy`: dependem de `cookies()`, que só funciona dentro
  de uma requisição real do Next.js.
- Subi um Postgres local neste sandbox especificamente para tentar validar
  a suíte de integração de ponta a ponta — travou no mesmo bloqueio de
  rede do Prisma acima (o engine é necessário mesmo com o banco disponível).

## COMO TESTAR MANUALMENTE APÓS O DEPLOY

1. Entrar no VortCon normalmente.
2. Clicar no avatar (topo direito) → "Tema escuro".
3. Confirmar: fundo e texto mudam, cores de marca/semáforos não mudam,
   navegar entre telas do app mantém o tema.
4. Sair e visitar o site institucional / tela de login — devem continuar
   sempre claros, independente do que foi escolhido dentro do app.
5. Trocar de navegador (ou aba anônima) e logar de novo — o tema deve vir
   já como estava da última vez (persistência por conta).
