import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts', 'src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/modules': path.resolve(__dirname, './src/modules'),
      '@/shared': path.resolve(__dirname, './src/shared'),
    },
  },
  // tsconfig.json usa "jsx": "preserve" (delega a transformação pro
  // bundler do Next.js, que injeta o runtime automático). O esbuild do
  // Vitest não infere isso sozinho e cai no modo clássico por padrão, que
  // exige `React` no escopo de todo arquivo com JSX — quebra qualquer
  // .tsx com JSX que um teste importe (achado real no Estágio 18, via o
  // primeiro CI de verdade: `report-pdf.tsx` nunca precisou de
  // `import React` pra funcionar no Next.js, só quebrou aqui). Configurado
  // explicitamente pra bater com o mesmo runtime automático do Next.js.
  esbuild: {
    jsx: 'automatic',
  },
});
