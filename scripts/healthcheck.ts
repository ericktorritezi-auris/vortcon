/**
 * Smoke test de deploy (Seção 167: merge → CI → build → migrations → Railway →
 * web/worker → smoke tests). Roda fora do processo Next, contra a URL pública.
 */
const url = `${process.env.APP_URL ?? 'http://localhost:3000'}/api/health`;

async function main(): Promise<void> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Healthcheck falhou: HTTP ${response.status} em ${url}`);
  }

  const body = (await response.json()) as { status: string };

  if (body.status !== 'ok') {
    throw new Error(`Healthcheck retornou status inesperado: ${body.status}`);
  }

  console.warn(`[smoke] ${url} respondeu ok.`);
}

main().catch((error: unknown) => {
  console.error('[smoke] falhou:', error);
  process.exit(1);
});
