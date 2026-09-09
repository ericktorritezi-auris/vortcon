/**
 * Seção 176 ("push inválido") — decide se um erro do provedor de push
 * significa "esta inscrição não existe mais" (o navegador revogou a
 * permissão). Arquivo próprio, sem nenhuma dependência de Prisma/banco —
 * assim a lógica é testável isoladamente, sem precisar mockar a
 * biblioteca web-push inteira nem fazer uma chamada de rede real.
 */
export function isExpiredSubscriptionError(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}
