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
        ],
      },
    ];
  },
};

export default nextConfig;
