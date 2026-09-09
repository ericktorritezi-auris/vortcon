# QA Manual — itens que exigem navegador real (Seção 177 e afins)

Este checklist cobre exatamente os itens da especificação que **não podem ser
validados por teste automatizado** neste ambiente de desenvolvimento — exigem um
navegador de verdade, um aparelho de verdade, ou um provedor de push de verdade.
Tudo que É automatizável já está coberto pela suíte de testes (ver README, seção
"Estágio 17 — QA").

Marque cada item depois de testar manualmente no Railway, num navegador/aparelho
real.

## PWA (Seção 177)

- [ ] **Manifest** — abrir `/manifest.json` direto no navegador, confirmar que
      carrega sem erro e todos os campos batem com o esperado (nome, ícones,
      `theme_color`, `background_color`)
- [ ] **Instalação** — no Android/Chrome, confirmar que o prompt "Adicionar à tela
      inicial" aparece; no iOS/Safari, confirmar que "Adicionar à Tela de Início"
      (menu de Compartilhar) funciona e o ícone aparece correto
- [ ] **Ícones** — depois de instalado, conferir que o ícone na tela inicial não
      está esticado/cortado — em especial no Android, testar em pelo menos um
      formato de máscara diferente (círculo, ex.: alguns launchers Samsung/Pixel)
- [ ] **Standalone** — abrir o app instalado e confirmar que abre em tela cheia,
      sem a barra de endereço do navegador
- [ ] **Service worker** — no DevTools (Application → Service Workers), confirmar
      que registra sem erro e fica `activated`
- [ ] **Push** — ativar push em Meu Perfil, fechar o app, mandar uma notificação
      de teste (ex.: marcar uma transação com lembrete pro dia de hoje e esperar o
      job das 08h, ou dar um `POST` manual em `/api/jobs/run` autenticado) e
      confirmar que a notificação chega mesmo com o app fechado
- [ ] **Reconnect** — desinstalar e reinstalar o app; confirmar que a tela de
      login sugere ativar biometria/push de novo nesse aparelho "novo"
- [ ] **Cache seguro** — no DevTools (Application → Cache Storage), confirmar que
      só os arquivos estáticos (ícones, manifest) estão em cache — nunca uma
      página com dado financeiro, nunca uma resposta de `/api/*`

## Biometria (Estágio 14, mesma natureza de limitação)

- [ ] Login por biometria funciona no aparelho instalado, ida e volta (ativar,
      sair, entrar de novo só com biometria)
- [ ] iOS 16.4+ especificamente — versões mais antigas não devem quebrar o app,
      só não oferecer a opção

## Por que isso não está na suíte automatizada

Testes automatizados (Vitest) rodam em Node, sem DOM nem navegador — não têm como
disparar um prompt de instalação real, verificar um ícone renderizado, ou receber
um push de verdade num aparelho. A lógica por trás de cada um desses itens (o
`manifest.json` em si, a lógica de registro do service worker, a lógica de envio de
push) já é testada isoladamente onde é possível (ver `push-error-classification.ts`,
por exemplo) — o que falta aqui é confirmar que o _navegador_ se comporta como
esperado com esse código, o que só um teste manual (ou uma suíte E2E com Playwright
rodando contra um navegador real, fora do escopo desta rodada) consegue provar.
