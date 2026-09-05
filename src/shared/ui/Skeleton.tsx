interface SkeletonProps {
  className?: string;
  'aria-label'?: string;
}

/**
 * Skeleton de carregamento (Seção 206). `aria-hidden` por padrão — o
 * container que o usa deve ter `aria-busy`/anúncio próprio quando relevante.
 * Respeita `prefers-reduced-motion` via `motion-reduce:animate-none`.
 */
export function Skeleton({ className, ...props }: SkeletonProps): React.ReactElement {
  return (
    <div
      aria-hidden="true"
      className={['animate-pulse rounded-md bg-ink-secondary/10 motion-reduce:animate-none', className ?? ''].join(
        ' ',
      )}
      {...props}
    />
  );
}
