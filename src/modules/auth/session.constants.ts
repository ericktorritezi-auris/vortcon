/**
 * Isolado deliberadamente em um arquivo próprio, sem nenhum outro import.
 * `middleware.ts` roda em Edge Runtime e não suporta `node:crypto` (usado
 * por `tokens.ts`) nem `next/headers` (usado por `session.service.ts`) — se
 * este nome de cookie vivesse em qualquer um desses módulos, importar só a
 * constante arrastaria a dependência inteira e quebraria o build do
 * middleware. `session.service.ts` também importa daqui, para nunca haver
 * duas fontes de verdade para o nome do cookie.
 */
export const SESSION_COOKIE_NAME = 'vortcon_session';
