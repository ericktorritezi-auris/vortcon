import { Resend } from 'resend';
import { env } from '@/shared/config/env';
import { renderEmailLayout } from './email-layout';

/**
 * Integração com Resend (Seção 125). Envio direto por enquanto — o
 * Estágio 13 envolve estas chamadas num Transactional Outbox (Seção 126)
 * para garantir retry/consistência com o banco. Até lá, uma falha de envio
 * aqui propaga como erro para quem chamou (o fluxo de convite/reset trata
 * isso explicitamente).
 *
 * Se `RESEND_API_KEY` não estiver configurada (ambiente local, CI, preview
 * sem a chave), o envio é pulado com um aviso no log em vez de derrubar o
 * fluxo — decisão pragmática para não travar desenvolvimento/QA por uma
 * variável comercial. Em produção a variável é obrigatória via `.env.example`.
 *
 * Evolução v1.5 (pedido do cliente) — todo disparo agora passa por
 * `renderEmailLayout`, com a identidade visual do VortCon (cores, wordmark,
 * rodapé), em vez de texto puro.
 */
const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'naoresponda@vortcon.belleplanner.com.br';

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!resendClient) {
    console.warn(
      `[email] RESEND_API_KEY não configurada — envio pulado. Destinatário: ${to}, assunto: ${subject}`,
    );
    return;
  }

  const result = await resendClient.emails.send({ from: FROM_EMAIL, to, subject, html });

  if (result.error) {
    throw new Error(`Falha ao enviar e-mail via Resend: ${result.error.message}`);
  }
}

export async function sendInviteEmail(
  to: string,
  name: string,
  username: string,
  inviteUrl: string,
): Promise<void> {
  const html = renderEmailLayout({
    preheader: 'Sua conta VortCon foi criada — defina sua senha para começar.',
    heading: `Olá, ${name}!`,
    paragraphs: [
      'Sua conta VortCon foi criada. Para ativá-la, defina sua senha clicando no botão abaixo:',
      `Seu usuário de login é <strong>${username}</strong> — guarde-o, você vai usá-lo (não o e-mail) para entrar depois de ativar a conta.`,
    ],
    button: { label: 'Definir minha senha', url: inviteUrl },
    footnote: 'Este link expira em 48 horas e só pode ser usado uma vez.',
  });
  await sendEmail(to, 'Bem-vindo à VortCon — defina sua senha', html);
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const html = renderEmailLayout({
    preheader: 'Recebemos uma solicitação para redefinir sua senha.',
    heading: 'Recuperação de senha',
    paragraphs: ['Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo:'],
    button: { label: 'Redefinir minha senha', url: resetUrl },
    footnote:
      'Este link expira em 1 hora e só pode ser usado uma vez. Se você não solicitou isso, ignore este e-mail.',
  });
  await sendEmail(to, 'VortCon — Recuperação de senha', html);
}

/** Assinatura próxima (Seção 123) — 3 dias antes do vencimento. */
export async function sendSubscriptionReminderEmail(
  to: string,
  planName: string,
  amountFormatted: string,
  dueDateFormatted: string,
): Promise<void> {
  const html = renderEmailLayout({
    preheader: `Sua mensalidade do plano ${planName} vence em ${dueDateFormatted}.`,
    heading: 'Sua mensalidade vence em breve',
    paragraphs: [
      `Sua mensalidade do plano <strong>${planName}</strong> (${amountFormatted}) vence em <strong>${dueDateFormatted}</strong>.`,
      'Acesse o app para conferir os detalhes de pagamento.',
    ],
    button: { label: 'Acessar o VortCon', url: env.APP_URL },
  });
  await sendEmail(to, 'VortCon — Sua mensalidade vence em breve', html);
}

/** Pendência (Seção 123) — aviso pós-vencimento, único, nunca cobrança diária (Seção 123). */
export async function sendSubscriptionOverdueEmail(to: string, planName: string): Promise<void> {
  const html = renderEmailLayout({
    preheader: `Sua mensalidade do plano ${planName} está em atraso.`,
    heading: 'Mensalidade em atraso',
    paragraphs: [
      `Identificamos que sua mensalidade do plano <strong>${planName}</strong> está em atraso.`,
      'Regularize o quanto antes para evitar o bloqueio da sua conta.',
    ],
    button: { label: 'Acessar o VortCon', url: env.APP_URL },
  });
  await sendEmail(to, 'VortCon — Mensalidade em atraso', html);
}

/** Confirmação (Seção 124) — pagamento confirmado. Falha de envio aqui nunca desfaz o pagamento já registrado. */
export async function sendPaymentConfirmedEmail(
  to: string,
  planName: string,
  amountFormatted: string,
): Promise<void> {
  const html = renderEmailLayout({
    preheader: `Pagamento de ${amountFormatted} confirmado. Obrigado por continuar com a gente!`,
    heading: 'Pagamento confirmado',
    paragraphs: [
      `Recebemos a confirmação do pagamento da sua mensalidade do plano <strong>${planName}</strong> (${amountFormatted}).`,
      'Obrigado por continuar com a gente!',
    ],
    button: { label: 'Acessar o VortCon', url: env.APP_URL },
  });
  await sendEmail(to, 'VortCon — Pagamento confirmado', html);
}

/** Bloqueio (Seção 125, conectado na evolução v1.5) — conta bloqueada. */
export async function sendAccountBlockedEmail(to: string, reason: string): Promise<void> {
  const html = renderEmailLayout({
    preheader: 'Sua conta VortCon foi bloqueada.',
    heading: 'Sua conta foi bloqueada',
    paragraphs: [
      `Sua conta foi bloqueada: ${reason}.`,
      'Entre em contato ou regularize a pendência para restaurar o acesso.',
    ],
  });
  await sendEmail(to, 'VortCon — Sua conta foi bloqueada', html);
}

/** Desbloqueio (Seção 125, conectado na evolução v1.5) — conta desbloqueada. */
export async function sendAccountUnblockedEmail(to: string): Promise<void> {
  const html = renderEmailLayout({
    preheader: 'Sua conta VortCon foi desbloqueada — o acesso já está normalizado.',
    heading: 'Sua conta foi desbloqueada',
    paragraphs: ['Boa notícia: sua conta foi desbloqueada e o acesso já está normalizado.'],
    button: { label: 'Acessar o VortCon', url: env.APP_URL },
  });
  await sendEmail(to, 'VortCon — Sua conta foi desbloqueada', html);
}
