import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/shared/ui';
import { ServiceWorkerRegistration } from './ServiceWorkerRegistration';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'VortCon — Entenda seu dinheiro. Assuma o controle.',
  description:
    'Plataforma inteligente de organização e controle financeiro pessoal. Desenvolvido por Belle Planner.',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  // iOS não lê manifest.json pra maioria destas configurações — precisa
  // das próprias meta tags (Seção 138). "default" no status bar deixa a
  // barra de status transparente sobre o conteúdo, combinando com o tema.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VortCon',
  },
};

export const viewport: Viewport = {
  themeColor: '#123B46',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans">
        <ServiceWorkerRegistration />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
