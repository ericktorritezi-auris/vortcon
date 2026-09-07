import type { WebAuthnCredential as StoredWebAuthnCredential } from '@prisma/client';
import { cookies } from 'next/headers';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
  WebAuthnCredential as LibWebAuthnCredential,
} from '@simplewebauthn/types';
import { prisma } from '@/shared/database/client';
import { getRelyingPartyConfig } from './rp-config';

const CHALLENGE_COOKIE_NAME = 'webauthn_challenge';
const CHALLENGE_MAX_AGE_SECONDS = 5 * 60;

function setChallengeCookie(challenge: string): void {
  cookies().set(CHALLENGE_COOKIE_NAME, challenge, {
    httpOnly: true,
    secure: process.env.APP_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: CHALLENGE_MAX_AGE_SECONDS,
  });
}

function consumeChallengeCookie(): string | null {
  const challenge = cookies().get(CHALLENGE_COOKIE_NAME)?.value ?? null;
  cookies().delete(CHALLENGE_COOKIE_NAME);
  return challenge;
}

/**
 * Opções de registro (login biométrico, pedido do cliente). Exige
 * authenticatorAttachment: 'platform' — só biometria embutida no aparelho
 * (Face ID, Touch ID, digital do Android), nunca chave de segurança
 * externa. residentKey: 'required' é o que permite o login "sem digitar
 * usuário" depois — o navegador/SO já sabe qual credencial oferecer.
 */
export async function getRegistrationOptions(userId: string, userEmail: string, userName: string) {
  const { rpID, rpName } = getRelyingPartyConfig();

  const existingCredentials = await prisma.webAuthnCredential.findMany({ where: { userId } });

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(userId),
    userName: userEmail,
    userDisplayName: userName,
    attestationType: 'none',
    excludeCredentials: existingCredentials.map((credential: StoredWebAuthnCredential) => ({
      id: credential.credentialId,
      transports: credential.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
      authenticatorAttachment: 'platform',
    },
  });

  setChallengeCookie(options.challenge);
  return options;
}

interface VerifyRegistrationResult {
  verified: boolean;
  error?: string;
}

export async function verifyRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  deviceName?: string,
): Promise<VerifyRegistrationResult> {
  const expectedChallenge = consumeChallengeCookie();
  if (!expectedChallenge) {
    return { verified: false, error: 'Desafio expirado ou ausente. Tente novamente.' };
  }

  const { rpID, expectedOrigin } = getRelyingPartyConfig();

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin,
    expectedRPID: rpID,
  });

  if (!verification.verified || !verification.registrationInfo) {
    return { verified: false, error: 'Não foi possível verificar a biometria.' };
  }

  const { credential } = verification.registrationInfo;

  await prisma.webAuthnCredential.create({
    data: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ?? [],
      deviceName,
    },
  });

  return { verified: true };
}

/**
 * Opções de autenticação — allowCredentials vazio de propósito: o
 * navegador/SO decide sozinho quais credenciais (passkeys) oferecer pra
 * este domínio, sem o servidor precisar saber quem está tentando entrar
 * antes de perguntar. É isso que permite o botão "Entrar com biometria" na
 * tela de login, sem exigir usuário/e-mail digitado antes.
 */
export async function getAuthenticationOptions() {
  const { rpID } = getRelyingPartyConfig();

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
  });

  setChallengeCookie(options.challenge);
  return options;
}

interface VerifyAuthenticationResult {
  verified: boolean;
  userId?: string;
  error?: string;
}

export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
): Promise<VerifyAuthenticationResult> {
  const expectedChallenge = consumeChallengeCookie();
  if (!expectedChallenge) {
    return { verified: false, error: 'Desafio expirado ou ausente. Tente novamente.' };
  }

  const storedCredential = await prisma.webAuthnCredential.findUnique({
    where: { credentialId: response.id },
  });

  if (!storedCredential) {
    return { verified: false, error: 'Credencial não reconhecida.' };
  }

  const { rpID, expectedOrigin } = getRelyingPartyConfig();

  const libCredential: LibWebAuthnCredential = {
    id: storedCredential.credentialId,
    publicKey: new Uint8Array(storedCredential.publicKey),
    counter: storedCredential.counter,
    transports: storedCredential.transports as AuthenticatorTransportFuture[],
  };

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin,
    expectedRPID: rpID,
    credential: libCredential,
  });

  if (!verification.verified) {
    return { verified: false, error: 'Biometria não reconhecida.' };
  }

  await prisma.webAuthnCredential.update({
    where: { id: storedCredential.id },
    data: { counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() },
  });

  return { verified: true, userId: storedCredential.userId };
}

export async function hasWebAuthnCredentials(userId: string): Promise<boolean> {
  const count = await prisma.webAuthnCredential.count({ where: { userId } });
  return count > 0;
}

export async function listWebAuthnCredentials(userId: string) {
  return prisma.webAuthnCredential.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

export async function deleteWebAuthnCredential(
  userId: string,
  credentialId: string,
): Promise<void> {
  await prisma.webAuthnCredential.deleteMany({ where: { userId, id: credentialId } });
}
