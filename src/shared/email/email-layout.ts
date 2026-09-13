/**
 * Layout compartilhado de e-mail (evolução v1.5, pedido do cliente) —
 * identidade visual do VortCon aplicada a todo disparo. HTML de e-mail é
 * um universo à parte do resto do sistema: nunca flexbox/grid (não tem
 * suporte confiável, principalmente no Outlook), sempre tabela +
 * `style=""` inline (a maioria dos clientes de e-mail ignora `<style>` no
 * `<head>`), nunca fonte customizada carregada externamente (raramente
 * carrega), e a "logo" é texto estilizado, nunca uma imagem — a maioria
 * dos clientes bloqueia imagem externa por padrão, e o VortCon nunca quer
 * arriscar o e-mail chegar com um ícone de imagem quebrada no lugar da
 * marca.
 */

const BRAND_DEEP = '#123B46';
const BRAND_FLOW = '#19A7A0';
const INK_PRIMARY = '#172126';
const INK_SECONDARY = '#6B7C85';
const PAGE_BACKGROUND = '#F7F9FA';
const CARD_BACKGROUND = '#FFFFFF';
const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export type EmailButton = { label: string; url: string };

interface EmailLayoutInput {
  /** Texto de pré-visualização (aparece na lista de e-mails, antes de abrir — nunca visível dentro do corpo). */
  preheader: string;
  heading: string;
  /** Parágrafos do corpo — cada string vira um `<p>` já estilizado. Use `<strong>` dentro do texto quando precisar de destaque. */
  paragraphs: string[];
  button?: EmailButton;
  /** Nota pequena, cinza, abaixo do botão — ex.: validade de link. */
  footnote?: string;
}

export function renderEmailLayout(input: EmailLayoutInput): string {
  const { preheader, heading, paragraphs, button, footnote } = input;

  const paragraphsHtml = paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:${INK_PRIMARY};">${paragraph}</p>`,
    )
    .join('\n');

  const buttonHtml = button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;">
        <tr>
          <td style="border-radius:8px;background-color:${BRAND_FLOW};">
            <a href="${button.url}" target="_blank" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:8px;">${button.label}</a>
          </td>
        </tr>
      </table>`
    : '';

  const footnoteHtml = footnote
    ? `<p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;color:${INK_SECONDARY};">${footnote}</p>`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${heading}</title>
</head>
<body style="margin:0;padding:0;background-color:${PAGE_BACKGROUND};font-family:${FONT_STACK};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${PAGE_BACKGROUND};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;">

          <tr>
            <td style="padding:0 8px 20px 8px;">
              <span style="font-size:20px;font-weight:700;color:${BRAND_DEEP};letter-spacing:-0.02em;">Vort<span style="color:${BRAND_FLOW};">Con</span></span>
            </td>
          </tr>

          <tr>
            <td style="background-color:${CARD_BACKGROUND};border-radius:12px;padding:32px;">
              <h1 style="margin:0 0 16px 0;font-size:20px;line-height:1.3;color:${BRAND_DEEP};">${heading}</h1>
              ${paragraphsHtml}
              ${buttonHtml}
              ${footnoteHtml}
            </td>
          </tr>

          <tr>
            <td style="padding:20px 8px 0 8px;">
              <p style="margin:0 0 4px 0;font-size:12px;color:${INK_SECONDARY};">VortCon — Entenda seu dinheiro. Assuma o controle.</p>
              <p style="margin:0;font-size:12px;color:${INK_SECONDARY};">Este é um e-mail automático — não responda esta mensagem.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
