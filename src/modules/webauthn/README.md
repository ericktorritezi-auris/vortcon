# Módulo: webauthn

Login biométrico via WebAuthn/Passkeys — pedido explícito do cliente, acrescentado ao
escopo do Estágio 14 (PWA).

## Contexto do pedido

O cliente teve uma experiência ruim com biometria em outro produto (Agenda Belle
Planner), mesmo usando a mesma biblioteca (`@simplewebauthn`) — resultado
"Não autorizado". Por isso este módulo foi construído com cuidado extra:

- **API real conferida no código-fonte instalado** (`node_modules/@simplewebauthn/*/**.d.ts`),
  nunca por memória — a v11 mudou assinaturas em relação a versões anteriores (ex.:
  `startRegistration({ optionsJSON })`, não `startRegistration(options)` direto).
- **`rp-config.ts`**: `rpID` e `expectedOrigin` são SEMPRE derivados da mesma variável
  (`APP_URL`), nunca duas configurações separadas que podem dessincronizar — essa é a
  causa mais comum de "Não autorizado" nesse tipo de integração. Testado (5 testes),
  incluindo o caso que prova que porta nunca vaza pro `rpID`.
- **Formato de armazenamento é um espelho exato** do tipo `WebAuthnCredential` da
  biblioteca (`id`, `publicKey` como bytes, `counter`, `transports`) — nunca uma
  transformação própria que poderia introduzir erro de codificação.
- **Contador anti-clonagem sempre atualizado** após cada login — sem isso, uma
  tentativa de replay futura passaria sem checagem.

## Implementado

`webauthn.service.ts` — registro (`getRegistrationOptions`/`verifyRegistration`,
exige sessão já autenticada) e login (`getAuthenticationOptions`/`verifyAuthentication`,
público, sem precisar digitar usuário — credencial descobrível via
`residentKey: 'required'`). `authenticatorAttachment: 'platform'` restringe a só
biometria embutida no aparelho, nunca chave de segurança externa.

Login biométrico bem-sucedido cria a MESMA sessão que o login por senha
(`createSessionAndSetCookie`) — nenhum caminho de autenticação paralelo.

5 rotas de API, helper de cliente (`webauthn-client.ts`) com detecção de capability
(`browserSupportsWebAuthn`) e de contexto instalado (`display-mode: standalone` /
`navigator.standalone`). Integrado em `/entrar`: sugestão de ativar biometria após
login por senha bem-sucedido (só dentro do app instalado), e botão "Entrar com
biometria" quando já ativada neste aparelho.

## Backlog

Não existe ainda uma tela de gerenciamento de credenciais (listar/remover
dispositivos com biometria ativada) — a rota `DELETE /api/webauthn/credentials/[id]`
já existe no backend, mas não há UI de perfil/configurações no painel do tenant
ainda para expô-la. Registrado no README raiz.
