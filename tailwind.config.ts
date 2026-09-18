import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

// Tokens normativos — Master Document VortCon, Seções 7 (Paleta), 8 (Tipografia),
// 9 (Design Tokens) e 10 (Grid e Responsividade). Não hardcode cores/espaçamentos
// fora deste arquivo — Seção 14 exige Design System reutilizável e centralizado.
//
// Estágio 19 (Dark Mode): as cores abaixo apontam para as CSS variables
// definidas em `globals.css` (`--vc-*`), em vez de hex fixo. Isso é o que
// permite o toggle claro/escuro funcionar em cascata — trocar a classe
// `dark` na tag <html> redefine as variáveis, e toda classe Tailwind já
// usada no app (bg-surface-page, text-ink-primary, bg-brand-deep, ...)
// muda de cor automaticamente, sem precisar tocar em cada componente.
// `darkMode: 'class'` (não `media`) de propósito — o tema é uma preferência
// do usuário, salva por conta, não algo que deva seguir o SO do aparelho.
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          deep: 'var(--vc-deep)',
          flow: 'var(--vc-flow)',
          intelligence: 'var(--vc-intelligence)',
        },
        surface: {
          page: 'var(--vc-surface-page)',
          card: 'var(--vc-surface-card)',
        },
        ink: {
          primary: 'var(--vc-text-primary)',
          secondary: 'var(--vc-text-secondary)',
        },
        financial: {
          success: 'var(--vc-success)',
          danger: 'var(--vc-danger)',
          warning: 'var(--vc-warning)',
          info: 'var(--vc-info)',
          successText: 'var(--vc-success-text)',
          dangerText: 'var(--vc-danger-text)',
          warningText: 'var(--vc-warning-text)',
          infoText: 'var(--vc-info-text)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        4.5: '18px', // reservado — manter escala base 4/8/12/16/20/24/32/40/48/64
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        pill: '999px',
      },
    },
  },
  plugins: [typography],
};

export default config;
