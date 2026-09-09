/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // @node-rs/argon2 (Seção 26) é um binário nativo — nunca deve ser
  // empacotado pelo bundler do Next.js, só carregado via require() em
  // runtime. Sem isso, o build falha ao tentar interpretar o .node como JS.
  experimental: {
    serverComponentsExternalPackages: ['@node-rs/argon2'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // Seção 154 — baseline moderno. HSTS: a aplicação só roda atrás de
          // HTTPS em produção (Railway), então forçar isso no navegador por
          // 2 anos é seguro. CSP: 'self' cobre tudo — next/font baixa e
          // hospeda as fontes no próprio domínio em build-time (nunca busca
          // fonts.googleapis.com em runtime), então não precisa de exceção
          // para fontes externas. 'unsafe-inline' em script/style é
          // necessário para a hidratação do próprio Next.js App Router sem
          // infraestrutura de nonce — ainda bloqueia injeção de script de
          // outros domínios e enquadramento em iframe (frame-ancestors),
          // que são os vetores mais importantes de XSS/clickjacking.
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "connect-src 'self'",
              "manifest-src 'self'",
              "worker-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
