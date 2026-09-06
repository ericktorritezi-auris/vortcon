/**
 * Rate limiting (Seção 153) — especialmente login, forgot, reset, invite e
 * endpoints públicos. Implementação em memória por processo: solução mais
 * simples que preserva o requisito (Seção 0) para um monólito de instância
 * única. Se o app escalar horizontalmente, isso precisa migrar para um
 * store compartilhado (Redis) — documentado aqui para não ser esquecido.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
let lastCleanup = Date.now();

function cleanupExpiredBuckets(now: number): void {
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/**
 * Janela fixa simples. `key` deve combinar rota + identificador do
 * requisitante (ex.: login:203.0.113.10) para que limites de rotas
 * diferentes nunca se misturem.
 */
export function checkRateLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  cleanupExpiredBuckets(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** IP do requisitante, considerando o proxy do Railway. Nunca confiável para autorização — só para rate limit. */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  return forwardedFor?.split(',')[0]?.trim() ?? 'unknown';
}
