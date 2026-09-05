import { BarChart3, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import Link from 'next/link';
import { Button, Footer, Header } from '@/shared/ui';

/**
 * Landing Page pública (Seção 17): logo, proposta de valor, breve explicação,
 * CTA "Entrar", identidade VortCon, links legais, footer Belle Planner.
 */
export default function HomePage(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="mx-auto flex max-w-3xl flex-col items-center gap-5 px-6 py-16 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-brand-flow/10 px-3.5 py-1.5 text-xs font-semibold text-brand-flow">
            Acesso exclusivo para assinantes
          </span>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-ink-primary sm:text-5xl">
            Entenda seu dinheiro.
            <br />
            <span className="text-brand-flow">Assuma o controle.</span>
          </h1>

          <p className="max-w-xl text-base text-ink-secondary">
            A VortCon organiza suas receitas, despesas, contas e compromissos em um só lugar. Com
            clareza, inteligência e total segurança.
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link href="/entrar">
              <Button size="lg">Comece agora</Button>
            </Link>
            <Link href="/produto">
              <Button variant="secondary" size="lg">
                Conheça o produto
              </Button>
            </Link>
          </div>

          <dl className="mt-10 grid w-full grid-cols-2 gap-6 border-t border-ink-secondary/10 pt-8 sm:grid-cols-4">
            {[
              { icon: ShieldCheck, label: 'Seguro' },
              { icon: Zap, label: 'Rápido' },
              { icon: BarChart3, label: 'Completo' },
              { icon: Sparkles, label: 'Inteligente' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <Icon className="h-5 w-5 text-brand-flow" aria-hidden="true" />
                <dt className="sr-only">{label}</dt>
                <dd className="text-xs font-medium text-ink-secondary">{label}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <Footer />
    </div>
  );
}
