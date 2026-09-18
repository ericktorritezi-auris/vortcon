# Changelog

Todas as mudanças notáveis do VortCon são documentadas aqui. Formato baseado em
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), versionamento
[SemVer](https://semver.org/lang/pt-BR/).

## [1.6.2] — 2026-09-18

### Removido

- **Dark mode**: o toggle de tema claro/escuro (Estágio 19, adicionado na
  1.6.0) foi removido a pedido do cliente, que não gostou do formato depois
  de ver o resultado. Removidos: toggle no Topbar, módulo `theme`
  (`src/modules/theme`, `src/shared/theme`), endpoint `/api/profile/theme`,
  sincronização do cookie de tema no login, campo `User.themePreference` e
  a seção "Tema claro/escuro" da Ajuda. A migration que criava o campo
  nunca chegou a rodar em produção, então foi apagada do histórico (não há
  down-migration nem coluna órfã a limpar). A arquitetura de cor por CSS
  variables foi mantida (não tem custo nem risco continuar existindo só com
  o tema claro); só `darkMode: 'class'` saiu do `tailwind.config.ts`.

## [1.6.1] — 2026-09-18

### Corrigido

- **Bug de inadimplência em tenants recém-criados (Seção 113)**: a primeira
  mensalidade de um tenant novo era calculada automaticamente como "dia X do
  mês em que o tenant nascesse" — se o tenant fosse criado depois do dia X,
  essa primeira cobrança já nascia com vencimento no passado, e o tenant
  podia ser bloqueado por inadimplência minutos depois de criado, sem nunca
  ter tido chance de pagar.

### Alterado

- **Primeira cobrança agora é escolhida pelo Admin**: no lugar de um número
  de dia (1-28), o formulário de criação de tenant pede a data exata da
  primeira mensalidade — um humano nunca escolhe uma data já vencida, então
  o bug acima deixa de poder acontecer por construção. O sistema nunca mais
  deriva essa primeira data sozinho. As mensalidades seguintes (mês 2 em
  diante) continuam repetindo automaticamente o mesmo dia do mês da data
  escolhida (sem ajuste de dia útil).

## [1.6.0] — 2026-09-18

### Adicionado

- **Dark mode**: toggle de tema claro/escuro no dropdown do avatar (Topbar),
  isolado à área autenticada — nunca afeta o site institucional, páginas
  legais ou a tela de login. Preferência persistida por usuário
  (`User.themePreference`), sincronizada entre dispositivos no login;
  cores de marca e semáforos financeiros permanecem constantes nos dois
  temas.

## [1.0.0] — 2026-09-09

Primeira versão completa em produção. Construído incrementalmente em 18 estágios
— ver README.md para o histórico detalhado de cada um, incluindo decisões,
correções e achados no caminho.

### Adicionado

- **Multitenancy e autenticação**: Admin provisiona tenant, convite por e-mail,
  ativação com senha própria, login por biometria (WebAuthn/Passkeys)
- **Financial Engine**: motor único de cálculo financeiro (saldo real, saldo
  projetado, resultado por competência vs. caixa) — nunca duplicado em nenhuma
  tela
- **Contas, categorias e tags globais**: categoria e tag nunca têm natureza fixa
  — a mesma categoria/tag serve pra receita e despesa, sempre
- **Transações**: receitas/despesas com lembrete, edição, cancelamento/
  reativação, e toggle bidirecional pago/recebido
- **Transferências**: entre contas, nunca distorcendo o resultado, com toggle
  bidirecional transferido/não transferido
- **Recorrências**: para transações e transferências, com materialização
  automática e idempotente
- **Planos e assinatura**: preço congelado por contrato, pagamento via PIX
  manual, inadimplência automatizada (bloqueio D+5), isenção
- **Documentos legais**: versionados, com gate de aceite obrigatório e editor
  WYSIWYG
- **Dashboard, Cockpit e Relatórios**: consistentes entre si (mesmo Financial
  Engine), com exportação em PDF e Excel
- **Insight Engine**: determinístico (nunca IA generativa), insights por
  categoria bidirecionais
- **Notificações**: central interna, push (multi-dispositivo), e-mail via
  Resend, lembretes de vencimento no horário local do tenant
- **PWA**: instalável (Android/iOS), com service worker e cache seguro
- **Backup**: exportação/restauração por tenant, com manifesto versionado e
  checksum de integridade
- **Painel Admin**: visão geral com saúde do sistema, gestão de tenants,
  bloqueios, auditoria
- **Páginas públicas**: vendas (produto, funcionalidades, planos alimentado
  pelo banco), manual de ajuda dentro do painel

### Segurança

- Rate limiting em todos os endpoints de autenticação
- Security headers completos (CSP, HSTS)
- Sanitização de HTML rico (documentos legais) e proteção contra formula
  injection (exportação Excel)
- Isolamento multitenant auditado e testado extensivamente (Estágio 17)

### Notas de arquitetura

- Jobs agendados via Railway Cron chamando rotas de API protegidas — nunca um
  serviço "Worker" separado. Decisão técnica documentada no README, seção
  "Estágio 18 — Release".
