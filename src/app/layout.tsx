import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ToastProvider } from '@/shared/ui';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'VortCon — Entenda seu dinheiro. Assuma o controle.',
  description:
    'Plataforma inteligente de organização e controle financeiro pessoal. Desenvolvido por Belle Planner.',
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
