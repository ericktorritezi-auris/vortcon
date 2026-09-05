import type { Config } from 'tailwindcss';

// Tokens normativos — Master Document VortCon, Seções 7 (Paleta), 8 (Tipografia),
// 9 (Design Tokens) e 10 (Grid e Responsividade). Não hardcode cores/espaçamentos
// fora deste arquivo — Seção 14 exige Design System reutilizável e centralizado.
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          deep: '#123B46',
          flow: '#19A7A0',
          intelligence: '#3C82F6',
        },
        surface: {
          page: '#F7F9FA',
          card: '#FFFFFF',
        },
        ink: {
          primary: '#172126',
          secondary: '#6B7C85',
        },
        financial: {
          success: '#22C55E',
          danger: '#EF4444',
          warning: '#F59E0B',
          info: '#3C82F6',
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
  plugins: [],
};

export default config;
