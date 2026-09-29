# Changelog

Todas as mudanças notáveis do VortCon são documentadas aqui. Formato baseado em
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), versionamento
[SemVer](https://semver.org/lang/pt-BR/).

## [1.8.3] — 2026-09-29

### Corrigido

- **Simulação — tela quebrada no mobile** (pedido do cliente): a lista (grade
  fixa de 6 colunas) e o painel de previsão (fixo do lado, largura fixa)
  não cabiam em tela estreita, causando estouro horizontal. Abaixo de
  `md` (768px — mesmo ponto de corte que o app já usa pra trocar entre o
  menu mobile e a barra lateral desktop), a lista agora vira cartões
  empilhados (checkbox, descrição, categoria, tipo/status e valor — mesmo
  padrão já usado em Transações) e o painel de previsão vira uma barra
  fixa no rodapé mostrando o Resultado líquido, que expande pra cima ao
  tocar mostrando o detalhe completo (A receber, A pagar e os itens
  selecionados). Os filtros também passaram a ocupar a largura toda em
  duas colunas no mobile, em vez de forçar rolagem lateral. Em `md` e
  acima, nada mudou — mesma grade de 6 colunas e mesmo painel fixo do
  lado de sempre. Puramente visual/estrutural: nenhum cálculo, filtro ou
  comportamento de seleção foi alterado.

## [1.8.2] — 2026-09-29

### Corrigido

- **Simulação — coluna de descrição faltando** (pedido do cliente): a
  coluna que só mostrava a Categoria agora mostra a Descrição da
  transação (linha principal) com a Categoria embaixo, em cinza — mesma
  hierarquia já usada em Transações. Atualizado também no painel de
  previsão (itens selecionados) e no rótulo acessível da caixinha de
  seleção.

## [1.8.1] — 2026-09-29

### Corrigido

- **Teste `commercial-flow.test.ts` falhando no CI** ("sem atraso, nenhum
  bloqueio e aplicado" e "Seção 174 — atraso claramente dentro da carência
  nunca bloqueia"), mesma CLASSE de bug já corrigida na 1.6.3 — data
  derivada de "hoje" vazando pra dentro de uma suíte que devia ser
  determinística, não um bug de produção. A cobrança do mês vigente criada
  pelo teste de idempotência de `ensureCurrentMonthCharge` herda o dia de
  vencimento (dia 15) de `firstDueDateNextMonth()`, mas aplicado ao mês
  corrente — então, rodando o CI depois do dia 20 de qualquer mês (dia 15 +
  5 dias de carência), essa cobrança nasce no teste já vencida além da
  carência, sem que nenhum teste seguinte a pague ou neutralize
  (os testes de bloqueio abaixo mexem na cobrança do provisionamento, não
  nela), virando um bloqueio automático "fantasma" que pega os testes
  seguintes de surpresa. Corrigido empurrando o vencimento dessa cobrança
  pra um futuro seguro logo depois de provar a idempotência — a data dela
  nunca fez parte do que aquele teste precisa validar.

## [1.8.0] — 2026-09-29

### Adicionado

- **Simulação (pedido do cliente)**: novo menu, tela 100% de consulta —
  não edita, não cria, não cancela nada, nunca escreve no banco. Filtros
  por mês (sempre mês, nunca período), Receitas/Despesas, Categoria, Conta
  e Status (Pendente, Paga, Recebida, Cancelada), todos abrindo em
  "Todos". Lista os lançamentos do mês (data, categoria, tipo, status,
  valor) com uma caixinha de seleção por linha; ao marcar, um painel à
  direita soma o que foi selecionado, mostrando o acumulado crescendo
  linha a linha, além do total separado em "A receber", "A pagar" e
  resultado líquido. A seleção sobrevive a troca de filtro (Tipo,
  Categoria, Conta, Status) — só trocar de mês zera, porque o universo de
  lançamentos muda de verdade. Puramente informativo: não passa pelo
  Financial Engine nem por nenhum outro cálculo do sistema — pra mudar um
  valor, o usuário sai pra Transações, edita lá (inclusive com o
  histórico de ajuste da 1.7.0) e volta pra reavaliar.

## [1.7.0] — 2026-09-19

### Adicionado

- **Histórico do valor de uma transação (pedido do cliente)**: na edição de
  uma receita/despesa, dois botões "−"/"+" ao lado do campo Valor permitem
  somar ou subtrair um ajuste sem digitar o valor final na mão — útil para
  lançamentos de planejamento (ex.: nasce no dia 1º com R$ 0,01 e vai
  somando conforme o mês anda). Cada confirmação (✓) grava uma linha em
  "Histórico do valor" com o valor do ajuste e a data — sempre automática,
  nunca escolhida pelo usuário (mesma filosofia da 1.6.1, Seção 113: nunca
  confiar em data digitada quando o sistema já sabe "agora"). O histórico é
  visível tanto no detalhe quanto na edição da transação; na edição, cada
  linha tem um ✕ para excluir um ajuste lançado errado, recalculando o
  valor total na hora. Editar o campo Valor direto, sem usar os botões
  +/-, continua funcionando exatamente como sempre e não gera nenhuma
  linha de histórico. Puramente informativo: nunca lido pelo Financial
  Engine, relatórios ou qualquer cálculo — o saldo sempre usa o
  `amountCents` da própria transação, como sempre; nenhuma outra transação
  é afetada.

### Adicionado (2026-09-19, sem mudança de versão)

- **Admin: editar Plano/Condição/Vencimento da assinatura do tenant**: na
  tela de detalhe do tenant (Admin), a seção "Assinatura" ganhou um
  formulário para trocar o Plano contratado, alternar Condição entre
  Pagante e Isento, e ajustar o dia de Vencimento — hoje só existia
  leitura desses campos. Trocar o plano re-precifica o valor contratado
  para o preço atual do novo plano (Seção 107 continua valendo para
  contratos que o Admin não mexe). Virar Isento (vindo de Pagante) cancela
  as mensalidades pendentes do tenant e levanta um bloqueio de
  inadimplência ativo, se houver (Seção 108: "isento sem dívida
  artificial"); mensalidades já pagas nunca são tocadas. Mudar o
  Vencimento só vale a partir da próxima mensalidade gerada, nunca
  reescreve uma já existente. Ajuste pontual, a pedido do cliente — não
  bump de versão.

## [1.6.3] — 2026-09-18

### Corrigido

- **Teste `commercial-flow.test.ts` falhando no CI** (`ensureCurrentMonthCharge
e idempotente`), causado por um teste mal ajustado à própria mudança da
  1.6.1: o teste provisiona o tenant com a 1ª cobrança no mês seguinte (de
  propósito, pra nunca ficar instável — ver 1.6.1), então a primeira
  chamada de `ensureCurrentMonthCharge` nesse teste cria, corretamente, a
  cobrança do mês corrente (que ainda não existia) — isso não é uma
  duplicata, é o comportamento certo. O teste comparava contra um número
  fixo (`toHaveLength(1)`) que só valia quando a 1ª cobrança e a do "mês
  corrente" coincidiam, suposição que deixou de valer com a correção da
  1.6.1. Reescrito para comparar a contagem antes/depois da 2ª chamada,
  testando idempotência de verdade (chamar de novo não cria mais nenhuma)
  em vez de um total fixo. Não é uma regressão de produção — o deploy e o
  comportamento real já estavam corretos; só o teste precisava de ajuste.

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
