'use client';

import {
  browserSupportsWebAuthn,
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';

const DEVICE_FLAG_KEY = 'vortcon-biometric-enabled';

/** true só depois de um registro concluído com sucesso NESTE aparelho/navegador — nunca setado por engano. */
export function isBiometricEnabledOnThisDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(DEVICE_FLAG_KEY) === '1';
}

function markBiometricEnabledOnThisDevice(): void {
  window.localStorage.setItem(DEVICE_FLAG_KEY, '1');
}

/** Rodando como app instalado (Android: display-mode; iOS: navigator.standalone) — nunca sugere biometria no navegador comum. */
export function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return window.matchMedia('(display-mode: standalone)').matches || iosStandalone;
}

export function supportsBiometricLogin(): boolean {
  return browserSupportsWebAuthn();
}

interface BiometricResult {
  success: boolean;
  error?: string;
}

/** Registra a biometria — exige que a pessoa já esteja autenticada (a rota de opções confere isso). */
export async function registerBiometric(deviceName?: string): Promise<BiometricResult> {
  try {
    const optionsResponse = await fetch('/api/webauthn/register/options', { method: 'POST' });
    if (!optionsResponse.ok) {
      return { success: false, error: 'Não foi possível iniciar o registro.' };
    }
    const optionsJSON = await optionsResponse.json();

    const registrationResponse = await startRegistration({ optionsJSON });

    const verifyResponse = await fetch('/api/webauthn/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: registrationResponse, deviceName }),
    });

    if (!verifyResponse.ok) {
      const body = (await verifyResponse.json().catch(() => ({}))) as { message?: string };
      return { success: false, error: body.message ?? 'Não foi possível confirmar a biometria.' };
    }

    markBiometricEnabledOnThisDevice();
    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      return { success: false, error: 'Biometria cancelada.' };
    }
    return { success: false, error: 'Este aparelho/navegador não suporta biometria.' };
  }
}

/** Login por biometria — sem precisar digitar usuário antes (allowCredentials vazio no servidor). */
export async function loginWithBiometric(): Promise<BiometricResult> {
  try {
    const optionsResponse = await fetch('/api/webauthn/login/options', { method: 'POST' });
    if (!optionsResponse.ok) {
      return { success: false, error: 'Não foi possível iniciar o login.' };
    }
    const optionsJSON = await optionsResponse.json();

    const authenticationResponse = await startAuthentication({ optionsJSON });

    const verifyResponse = await fetch('/api/webauthn/login/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: authenticationResponse }),
    });

    if (!verifyResponse.ok) {
      const body = (await verifyResponse.json().catch(() => ({}))) as { message?: string };
      return { success: false, error: body.message ?? 'Biometria não reconhecida.' };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.name === 'NotAllowedError') {
      return { success: false, error: 'Login por biometria cancelado.' };
    }
    return { success: false, error: 'Não foi possível usar a biometria agora.' };
  }
}
