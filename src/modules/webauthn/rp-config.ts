interface RelyingPartyConfig {
  rpID: string;
  rpName: string;
  expectedOrigin: string;
}

/**
 * Configuração do Relying Party (WebAuthn) — SEMPRE derivada de APP_URL,
 * nunca uma variável de ambiente própria e separada. Essa é a causa mais
 * comum de "Não autorizado" em integrações WebAuthn: rpID (o domínio) e
 * expectedOrigin (a origem completa, com protocolo) precisam vir
 * exatamente da mesma fonte, ou uma configuração desatualizada em um dos
 * dois faz a biblioteca rejeitar toda resposta do navegador — mesmo com a
 * biometria funcionando perfeitamente do lado do usuário.
 */
export function getRelyingPartyConfig(): RelyingPartyConfig {
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    throw new Error('APP_URL não configurado — obrigatório para o login biométrico (WebAuthn).');
  }

  const url = new URL(appUrl);

  return {
    rpID: url.hostname,
    rpName: 'VortCon',
    expectedOrigin: url.origin,
  };
}
