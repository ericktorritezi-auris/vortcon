/**
 * Placeholder do Estágio 1 — Fundação Técnica.
 *
 * A Landing Page normativa (Seção 17: logo, proposta de valor, CTA "Entrar",
 * links legais, footer Belle Planner) é construída no Estágio 2 (Design System),
 * já com os componentes globais reutilizáveis definidos na Seção 14.
 */
export default function HomePage(): React.ReactElement {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="text-2xl font-semibold text-[color:var(--vc-deep)]">VortCon</h1>
      <p className="max-w-md text-sm text-[color:var(--vc-text-secondary)]">
        Fundação técnica em construção — Estágio 1 de 18. A landing page e o Design System oficial
        chegam no próximo estágio.
      </p>
    </main>
  );
}
