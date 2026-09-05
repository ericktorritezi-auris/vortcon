/**
 * Símbolo VortCon — "Intelligent Flow" (Master Document, Seção 6).
 *
 * Os dois paths abaixo foram reconstruídos a partir do contorno real da
 * identidade oficial fornecida (extração de contorno + curvas bezier),
 * validados visualmente contra o arquivo original antes de entrar no
 * Design System. Não editar as coordenadas sem revalidar contra a
 * identidade oficial — pequenas mudanças quebram a fidelidade visual.
 *
 * Funciona em qualquer tamanho (favicon 16px até hero), monocromático ou
 * colorido, positivo ou negativo, conforme exigido na Seção 6.
 */
const LEFT_PATH =
  'M 8.00 9.00 C 4.70 9.00, 1.53 11.65, 0.70 13.60 C -0.13 15.55, 1.97 18.33, 3.00 20.70 C 4.03 23.07, 5.32 24.85, 6.90 27.80 C 8.48 30.75, 10.58 34.85, 12.50 38.40 C 14.42 41.95, 16.72 45.98, 18.40 49.10 C 20.08 52.22, 20.82 53.98, 22.60 57.10 C 24.38 60.22, 26.73 63.95, 29.10 67.80 C 31.47 71.65, 33.68 76.65, 36.80 80.20 C 39.92 83.75, 44.93 87.33, 47.80 89.10 C 50.67 90.87, 53.02 93.32, 54.00 90.80 C 54.98 88.28, 53.80 79.62, 53.70 74.00 C 53.60 68.38, 54.18 61.25, 53.40 57.10 C 52.62 52.95, 50.38 51.62, 49.00 49.10 C 47.62 46.58, 46.38 44.37, 45.10 42.00 C 43.82 39.63, 42.73 37.27, 41.30 34.90 C 39.87 32.53, 38.28 30.17, 36.50 27.80 C 34.72 25.43, 33.27 23.07, 30.60 20.70 C 27.93 18.33, 24.27 15.55, 20.50 13.60 C 16.73 11.65, 11.30 9.00, 8.00 9.00 Z';

const RIGHT_PATH =
  'M 100.00 9.00 C 103.30 9.00, 106.47 11.65, 107.30 13.60 C 108.13 15.55, 106.03 18.33, 105.00 20.70 C 103.97 23.07, 102.68 24.85, 101.10 27.80 C 99.52 30.75, 97.42 34.85, 95.50 38.40 C 93.58 41.95, 91.28 45.98, 89.60 49.10 C 87.92 52.22, 87.18 53.98, 85.40 57.10 C 83.62 60.22, 81.27 63.95, 78.90 67.80 C 76.53 71.65, 74.32 76.65, 71.20 80.20 C 68.08 83.75, 63.07 87.33, 60.20 89.10 C 57.33 90.87, 54.98 93.32, 54.00 90.80 C 53.02 88.28, 54.20 79.62, 54.30 74.00 C 54.40 68.38, 53.82 61.25, 54.60 57.10 C 55.38 52.95, 57.62 51.62, 59.00 49.10 C 60.38 46.58, 61.62 44.37, 62.90 42.00 C 64.18 39.63, 65.27 37.27, 66.70 34.90 C 68.13 32.53, 69.72 30.17, 71.50 27.80 C 73.28 25.43, 74.73 23.07, 77.40 20.70 C 80.07 18.33, 83.73 15.55, 87.50 13.60 C 91.27 11.65, 96.70 9.00, 100.00 9.00 Z';

interface VortConMarkProps {
  className?: string;
  /** Tamanho em px (largura). Altura calculada mantendo a proporção 108:100. */
  size?: number;
  /** 'gradient' (padrão, marca colorida) | 'currentColor' (monocromático, herda a cor do texto — Seção 6) */
  variant?: 'gradient' | 'currentColor';
  title?: string;
}

export function VortConMark({
  className,
  size = 32,
  variant = 'gradient',
  title = 'VortCon',
}: VortConMarkProps): React.ReactElement {
  const height = Math.round((size * 100) / 108);

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 108 100"
      role="img"
      aria-label={title}
      className={className}
    >
      <title>{title}</title>
      {variant === 'gradient' ? (
        <>
          <defs>
            <linearGradient id="vortconMarkLeft" x1="18" y1="8" x2="48" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#1EA6D6" />
              <stop offset="1" stopColor="#0B4F82" />
            </linearGradient>
            <linearGradient id="vortconMarkRight" x1="90" y1="8" x2="58" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#2FC9CB" />
              <stop offset="1" stopColor="#0C6E93" />
            </linearGradient>
          </defs>
          <path d={LEFT_PATH} fill="url(#vortconMarkLeft)" />
          <path d={RIGHT_PATH} fill="url(#vortconMarkRight)" opacity={0.94} />
        </>
      ) : (
        <>
          <path d={LEFT_PATH} fill="currentColor" />
          <path d={RIGHT_PATH} fill="currentColor" opacity={0.85} />
        </>
      )}
    </svg>
  );
}
