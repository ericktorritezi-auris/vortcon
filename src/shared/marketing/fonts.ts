import { Fraunces } from 'next/font/google';

/**
 * Fraunces — serifada com personalidade, para os títulos das páginas de
 * venda (Seção 136, pedido do cliente: "tem que fazer bonito"). Só nas
 * páginas de marketing público, nunca no app logado — o produto em si
 * usa só Inter, mais utilitário. next/font hospeda o arquivo no próprio
 * domínio em build-time, então não abre nenhuma exceção nova no CSP
 * (Estágio 16) para fontes externas.
 */
export const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  weight: ['400', '500', '600'],
});
