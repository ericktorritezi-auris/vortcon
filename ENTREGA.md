# VortCon — Entrega: correção da 1ª cobrança + remoção do Dark Mode

## VERSÃO

`1.6.0` → `1.6.2` (passou por `1.6.1` nesta mesma entrega — ver "Ordem dos eventos" abaixo)

Atualizada nos 4 locais rastreados: `package.json`, `src/modules/backup/backup.service.ts`
(`VORTCON_VERSION`), `src/shared/ui/Footer.tsx` (`APP_VERSION`), `src/app/api/health/route.ts`
(`version`, nos dois branches do healthcheck).

## ORDEM DOS EVENTOS NESTA ENTREGA

1. Você reportou o teste `commercial-flow.test.ts` falhando no CI. Investiguei e achei um
   bug real, pré-existente (não causado pelo Dark Mode): a primeira mensalidade de um
   tenant novo nascia com `dueDate` no passado se o tenant fosse criado depois do dia
   `dueDay` do mês — podendo bloquear o tenant por inadimplência minutos após a criação.
2. Você pediu pra corrigir "pro dia 10 útil" e depois confirmou corrigir também o bug de
   nascer já vencida. Propus uma correção que tratava só a primeira cobrança como caso
   especial — mas antes de implementar, você sugeriu uma correção melhor: o Admin escolhe
   a data exata da primeira cobrança, em vez do sistema derivar sozinho. Implementei essa
   versão (1.6.1).
3. Você viu o Dark Mode (entregue na 1.6.0) e pediu pra remover: _"remova a opção do tema
   escuro... Não gostei deste formato. Pode retirar do projeto."_ Removido nesta mesma
   entrega (1.6.2) — a correção da cobrança (item 2) continua presente.

## PARTE 1 — Correção: primeira cobrança escolhida pelo Admin (Seção 113)

### Causa raiz do bug antigo

A primeira mensalidade de um tenant era calculada como "dia `dueDay` do mês em que o
tenant fosse criado" (`dueDay` era um número 1-28, default 10, digitado pelo Admin). Se o
tenant nascesse depois do dia `dueDay` (ex.: `dueDay=10`, tenant criado dia 18), a
`dueDate` da primeira cobrança já nascia no passado. Como a carência de 5 dias (Seção 113)
conta a partir da `dueDate`, o tenant podia ser bloqueado por inadimplência quase
imediatamente, sem nunca ter tido chance de pagar. Confirmei que esse bug já existia antes
de eu tocar em qualquer arquivo (não foi introduzido pelo Dark Mode).

### Correção (decisão sua, melhor que minha proposta original)

O Admin agora escolhe a **data exata** da primeira cobrança no formulário de criação de
tenant (`DateInput`, não mais um número de dia) — um humano nunca escolhe uma data já
vencida, então o bug deixa de poder acontecer por construção, sem nenhuma lógica de "e se
hoje já passou do dia X".

- `src/modules/subscriptions/billing-dates.ts` (**novo**, puro, sem Prisma) —
  `validateFirstDueDate` (rejeita data passada e dia fora de 1-28 — mesma regra de sempre
  pra nunca cair em dia inexistente em fevereiro), `dueDateForCompetence`/
  `firstDayOfMonth`/`dueDayFromDate`, e `defaultFirstDueDate` (só para chamadas
  internas/testes que não testam cobrança — o endpoint do Admin nunca usa este default,
  o campo é obrigatório lá).
- A primeira `SubscriptionCharge` é criada dentro da MESMA transação do provisionamento do
  tenant (`tenant.service.ts`), usando a data escolhida pelo Admin literalmente, sem
  nenhum recálculo — tenant + assinatura + primeira mensalidade nascem atomicamente, ou
  nenhum dos três existe.
- As mensalidades seguintes (mês 2 em diante) continuam vindo de `ensureCurrentMonthCharge`
  (inalterada na lógica, só reaproveitando as funções puras movidas pra `billing-dates.ts`)
  — por definição, só roda depois que a assinatura já existe há pelo menos um mês, então o
  bug antigo não pode mais acontecer nem ali.
- **Sem ajuste de dia útil** — decisão sua, revertendo o pedido inicial de "dia 10 útil":
  a recorrência repete o mesmo dia do mês indefinidamente (18/09 → 18/10 → 18/11 → ...),
  mesmo caindo em fim de semana/feriado.
- Validação em profundidade: o formulário já impede escolher data passada (`min` no
  `DateInput`), e o backend (`validateFirstDueDate`, chamada tanto em `tenant.service.ts`
  quanto na API `/api/admin/tenants`) nunca confia só nisso.

### Arquivos desta parte

**Novos (2):**

- `src/modules/subscriptions/billing-dates.ts`
- `src/modules/subscriptions/billing-dates.test.ts` (13 casos)

**Alterados (7):**

- `src/modules/subscriptions/subscription.service.ts` — reaproveita as funções puras de
  `billing-dates.ts`; comentário do `ensureCurrentMonthCharge` atualizado.
- `src/modules/subscriptions/subscription.repository.ts` — `createCharge` passa a aceitar
  um client de transação opcional (mesmo padrão de `createSubscription`).
- `src/modules/tenants/tenant.service.ts` — `provisionTenantWithOwner` recebe
  `firstDueDate` (opcional só pra chamadas internas/teste — ver `billing-dates.ts`), valida,
  e cria a primeira mensalidade dentro da transação.
- `src/app/api/admin/tenants/route.ts` — `firstDueDate` obrigatório no lugar de `dueDay`,
  validado com a mesma regra do serviço.
- `src/app/admin/tenants/CreateTenantForm.tsx` — campo "Dia de vencimento" (número) virou
  "1ª cobrança" (`DateInput`, com `min` = hoje).
- `src/shared/ui/DateInput.tsx` — ganhou suporte a `hint` (mesmo padrão do `Input`), usado
  no campo acima.
- `tests/integration/commercial-flow.test.ts` — atualizado pro novo contrato; usa uma data
  fixa (dia 15 do mês seguinte) em vez de "hoje", pra nunca ficar instável se o CI rodar
  num dia 29/30/31 do mês (mesma classe de bug que esta entrega corrige).

## PARTE 2 — Remoção do Dark Mode (a seu pedido)

Removido por completo, sem deixar rastro:

**Excluídos (6 — listados em `DELETED_FILES.txt`):**

- `src/modules/theme/theme.constants.ts`
- `src/modules/theme/theme.service.ts`
- `src/shared/theme/ThemeToggle.tsx`
- `src/app/api/profile/theme/route.ts`
- `tests/unit/theme.test.ts`
- `prisma/migrations/20260918160000_theme_preference/migration.sql` — apagada do
  histórico em vez de revertida com uma nova migration, porque **nunca chegou a rodar em
  produção** (ainda estava em ciclo de CI/revisão com você). Não há coluna órfã nem
  down-migration pendente.

**Alterados (12):**

- `src/app/app/AppShell.tsx` / `src/app/admin/AdminShell.tsx` — removida a leitura do
  cookie de tema e a classe `dark` condicional no elemento-raiz.
- `src/shared/ui/Topbar.tsx` — removido o item "Tema escuro/claro" do dropdown do avatar.
- `prisma/schema.prisma` — removidos o enum `ThemePreference` e o campo
  `User.themePreference`.
- `src/app/globals.css` — removido o bloco `.dark { ... }` (variáveis de tema escuro) e a
  transição de cor que só fazia sentido com o toggle.
- `tailwind.config.ts` — removido `darkMode: 'class'`. A arquitetura de cor por CSS
  variables (`var(--vc-*)`) foi **mantida** — já existia antes do Dark Mode, não tem custo
  nem risco continuar existindo só com o tema claro, e trocar de volta pra hex fixo
  reintroduziria o mesmo problema de reordenação do Prettier que já corrigi numa entrega
  anterior (o `prettier-plugin-tailwindcss` recalcula a ordem das classes com base no tipo
  de valor da cor — troquei só o necessário, sem mexer nos valores).
- `src/app/app/ajuda/HelpContent.tsx` — removida a seção "Tema claro/escuro".
- `src/app/api/auth/login/route.ts`, `accept-invite/route.ts`,
  `webauthn/login/verify/route.ts` — removida a sincronização do cookie de tema no login.
- `CHANGELOG.md` / `README.md` — documentam a remoção (histórico transparente: o Dark Mode
  foi construído, entregue, e depois removido a seu pedido — nada foi apagado da história,
  só do código).

## MIGRATIONS

Nenhuma nesta entrega. A única migration que existiu (`20260918160000_theme_preference`)
foi criada E removida no mesmo ciclo, antes de rodar em produção — não sobrou nada pra
aplicar nem reverter no banco.

## QA EXECUTADO

- `npm run lint` — ✅ limpo (0 erros, 0 warnings), projeto inteiro.
- `npx prettier --check .` — ✅ limpo, projeto inteiro (confirmei que remover
  `darkMode: 'class'` não disparou o mesmo efeito cascata de reordenação que a troca
  hex→CSS-variable disparou numa entrega anterior — troquei só a flag, não os valores).
- `npx vitest run` (unitários, sem banco) — ✅ 23 arquivos, 159 testes, todos passando,
  incluindo os 13 novos casos de `billing-dates.test.ts` (fronteira exata: hoje mesmo,
  data passada, dia 29/30/31, virada de mês e de ano).
- `npm run typecheck` — mesma limitação já registrada no README desde o Estágio 1
  (`binaries.prisma.sh` bloqueado neste sandbox, então o `@prisma/client` fica com tipos
  genéricos e o projeto inteiro — não só este código — falha o `typecheck` nesses tipos).
  Isolei os erros que tocam os arquivos desta entrega: só um, e é exatamente o mesmo
  padrão genérico pré-existente (`Module '@prisma/client' has no exported member
'SubscriptionCharge'`), não um erro novo de lógica. Não afeta GitHub Actions nem Railway.
- `npm run test`/`npm run build` de ponta a ponta — mesma limitação, não roda neste
  sandbox. Recomendo deixar o CI real confirmar, como sempre.

## COMO TESTAR MANUALMENTE APÓS O DEPLOY

1. Admin → Criar tenant → o campo agora é "1ª cobrança" (calendário), não mais um número.
   Tentar escolher uma data passada deve ser bloqueado pelo próprio navegador (e, se
   forçado via API diretamente, pelo backend).
2. Criar um tenant com a 1ª cobrança pra daqui a poucos dias → conferir que a mensalidade
   já aparece em "Mensalidades" com essa data exata, sem nenhum bloqueio de inadimplência.
3. Confirmar que o dropdown do avatar (Topbar) não tem mais nenhuma opção de tema — só
   Calculadora e Sair.
4. Conferir que a Ajuda não menciona mais tema claro/escuro.
