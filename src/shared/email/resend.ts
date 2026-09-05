import { Resend } from 'resend';

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

export async function sendInviteEmail(to: string, name: string, inviteUrl: string): Promise<void> {
  await sendEmail(
    to,
    'Bem-vindo à VortCon — defina sua senha',
    `<p>Olá, ${name}.</p>
     <p>Sua conta VortCon foi criada. Para ativá-la, defina sua senha no link abaixo:</p>
     <p><a href="${inviteUrl}">${inviteUrl}</a></p>
     <p>Este link expira em 48 horas e só pode ser usado uma vez.</p>
     <p>VortCon — Entenda seu dinheiro. Assuma o controle.</p>`,
  );
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  await sendEmail(
    to,
    'VortCon — Recuperação de senha',
    `<p>Recebemos uma solicitação para redefinir sua senha.</p>
     <p><a href="${resetUrl}">${resetUrl}</a></p>
     <p>Este link expira em 1 hora e só pode ser usado uma vez. Se você não solicitou isso, ignore este e-mail.</p>`,
  );
}
