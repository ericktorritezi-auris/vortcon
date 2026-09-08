'use client';

import { Fingerprint, KeyRound, Trash2, User as UserIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, DateInput, Input } from '@/shared/ui';
import { registerBiometric, supportsBiometricLogin } from '@/modules/webauthn/webauthn-client';

interface ProfileViewProps {
  user: {
    name: string;
    email: string;
    username: string;
    phone: string | null;
    birthDate: string | null;
  };
}

interface CredentialItem {
  id: string;
  deviceName: string | null;
  createdAt: string;
  lastUsedAt: string;
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });

/**
 * Meu Perfil (pedido do cliente). Nunca aceita edição de email/username —
 * mostrados só como leitura, com uma nota explicando por quê.
 */
export function ProfileView({ user }: ProfileViewProps): React.ReactElement {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [birthDate, setBirthDate] = useState(user.birthDate ?? '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState<string | null>(null);

  useEffect(() => {
    setBiometricSupported(supportsBiometricLogin());
    void loadCredentials();
  }, []);

  async function loadCredentials(): Promise<void> {
    const response = await fetch('/api/webauthn/credentials');
    if (!response.ok) return;
    const data = (await response.json()) as { credentials: CredentialItem[] };
    setCredentials(data.credentials);
  }

  async function handleProfileSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);
    setProfileError(null);
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone: phone || null, birthDate: birthDate || null }),
      });
      if (!response.ok) {
        setProfileError('Não foi possível salvar os dados.');
        return;
      }
      setProfileMessage('Dados atualizados.');
    } finally {
      setProfileLoading(false);
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('A confirmação não bate com a nova senha.');
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setPasswordError(body.message ?? 'Não foi possível trocar a senha.');
        return;
      }
      setPasswordMessage('Senha alterada com sucesso.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } finally {
      setPasswordLoading(false);
    }
  }

  async function handleAddBiometric(): Promise<void> {
    setBiometricError(null);
    setBiometricLoading(true);
    try {
      const result = await registerBiometric();
      if (!result.success) {
        setBiometricError(result.error ?? 'Não foi possível ativar a biometria.');
        return;
      }
      await loadCredentials();
    } finally {
      setBiometricLoading(false);
    }
  }

  async function handleRemoveCredential(credentialId: string): Promise<void> {
    if (
      !window.confirm(
        'Remover esta biometria? Você vai precisar cadastrar de novo pra usá-la aqui.',
      )
    )
      return;
    await fetch(`/api/webauthn/credentials/${credentialId}`, { method: 'DELETE' });
    await loadCredentials();
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-ink-primary">Meu perfil</h1>

      <section className="rounded-lg border border-ink-secondary/15 bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-ink-primary">Dados pessoais</h2>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium text-ink-secondary">E-mail</p>
            <p className="text-sm text-ink-primary">{user.email}</p>
          </div>
          <div>
            <p className="mb-1 text-xs font-medium text-ink-secondary">Usuário</p>
            <p className="text-sm text-ink-primary">@{user.username}</p>
          </div>
        </div>
        <p className="mb-4 text-xs text-ink-secondary">
          E-mail e usuário não podem ser alterados por aqui — são o que vincula sua conta.
        </p>

        <form onSubmit={handleProfileSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
            <Input
              label="Telefone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              hint="Opcional"
            />
            <DateInput
              label="Data de nascimento"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </div>
          {profileMessage ? (
            <p className="text-sm text-financial-success">{profileMessage}</p>
          ) : null}
          {profileError ? <p className="text-sm text-financial-danger">{profileError}</p> : null}
          <Button type="submit" loading={profileLoading} className="w-fit">
            Salvar dados
          </Button>
        </form>
      </section>

      <section className="rounded-lg border border-ink-secondary/15 bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-ink-primary">Alterar senha</h2>
        </div>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-3">
          <Input
            label="Senha atual"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
            />
          </div>
          {passwordMessage ? (
            <p className="text-sm text-financial-success">{passwordMessage}</p>
          ) : null}
          {passwordError ? <p className="text-sm text-financial-danger">{passwordError}</p> : null}
          <Button type="submit" loading={passwordLoading} className="w-fit">
            Alterar senha
          </Button>
        </form>
      </section>

      {biometricSupported ? (
        <section className="rounded-lg border border-ink-secondary/15 bg-white p-4">
          <div className="mb-4 flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-ink-secondary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-ink-primary">Biometria</h2>
          </div>
          <p className="mb-4 text-xs text-ink-secondary">
            Se você perder o acesso à biometria neste aparelho (ex.: trocou de celular), remova a
            credencial antiga aqui e cadastre uma nova.
          </p>

          <div className="mb-4 flex flex-col divide-y divide-ink-secondary/10">
            {credentials.map((credential) => (
              <div
                key={credential.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <div>
                  <p className="text-ink-primary">
                    {credential.deviceName ?? 'Dispositivo sem nome'}
                  </p>
                  <p className="text-xs text-ink-secondary">
                    Ativada em {dateFormatter.format(new Date(credential.createdAt))} · última vez{' '}
                    {dateFormatter.format(new Date(credential.lastUsedAt))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveCredential(credential.id)}
                  aria-label="Remover esta biometria"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-financial-danger hover:bg-financial-danger/10"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ))}
            {credentials.length === 0 ? (
              <p className="py-2 text-sm text-ink-secondary">Nenhuma biometria ativada ainda.</p>
            ) : null}
          </div>

          {biometricError ? (
            <p className="mb-2 text-sm text-financial-danger">{biometricError}</p>
          ) : null}
          <Button variant="secondary" onClick={handleAddBiometric} loading={biometricLoading}>
            Ativar nova biometria neste aparelho
          </Button>
        </section>
      ) : null}
    </div>
  );
}
