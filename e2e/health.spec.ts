import { expect, test } from '@playwright/test';

test('GET /api/health responde ok com banco conectado', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.ok()).toBeTruthy();

  const body = (await response.json()) as { status: string; service: string };
  expect(body.status).toBe('ok');
  expect(body.service).toBe('vortcon');
});
