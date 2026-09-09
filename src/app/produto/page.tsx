import Link from 'next/link';
import { Bell, Fingerprint, PieChart, ShieldCheck } from 'lucide-react';
import { Footer, Header } from '@/shared/ui';
import { fraunces } from '@/shared/marketing/fonts';
import {
  CockpitMockup,
  ReportsMockup,
  TransactionsMockup,
} from '@/shared/marketing/ProductMockups';

export const metadata = {
  title: 'VortCon — Entenda seu dinheiro. Assuma o controle.',
  description:
    'O VortCon organiza contas, categorias e vencimentos automaticamente, e mostra todo mês exatamente para onde seu dinheiro foi.',
};

/**
 * Página de vendas (Seção 136, Estágio 16A) — pedido explícito do cliente:
 * "como se eu fosse vender o produto", com imagens reais (aqui, recriação
 * fiel das telas reais do VortCon, nunca ícone genérico), texto que
 * estimula a pessoa a querer usar. CTA é sempre "Entrar" — não existe
 * cadastro self-service no V1 (Admin sempre provisiona o tenant), então a
 * página nunca promete um botão de "assinar agora" que não existe.
 */
export default function ProdutoPage(): React.ReactElement {
  return (
    <div className={`flex min-h-screen flex-col ${fraunces.variable}`}>
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div>
            <h1
              className="mb-5 text-4xl leading-[1.1] text-brand-deep sm:text-5xl"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              Entenda seu dinheiro.
              <br />
              Assuma o controle.
            </h1>
            <p className="mb-8 max-w-md text-lg text-ink-secondary">
              O VortCon organiza contas, categorias e vencimentos automaticamente — e mostra, todo
              mês, exatamente para onde seu dinheiro foi. Sem planilha, sem esquecimento, sem
              surpresa no fim do mês.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/planos"
                className="rounded-md bg-brand-deep px-6 py-3 text-sm font-medium text-white hover:bg-brand-deep/90"
              >
                Ver planos
              </Link>
              <Link
                href="/entrar"
                className="rounded-md border border-ink-secondary/20 px-6 py-3 text-sm font-medium text-ink-primary hover:bg-surface-page"
              >
                Já sou cliente
              </Link>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <div className="rotate-[-2deg]">
              <CockpitMockup />
            </div>
          </div>
        </section>

        {/* O problema */}
        <section className="border-t border-ink-secondary/10 bg-white px-6 py-16">
          <div className="mx-auto max-w-3xl">
            <h2
              className="mb-4 text-2xl text-brand-deep sm:text-3xl"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              A maioria das pessoas só descobre o próprio saldo no dia do aperto.
            </h2>
            <p className="text-base leading-relaxed text-ink-secondary">
              Uma conta que vence e ninguém lembra. Um gasto que parecia pequeno e, somado aos
              outros, virou o mês inteiro no vermelho. Uma planilha que começou organizada em
              janeiro e em março já ninguém abre mais. O VortCon existe pra resolver exatamente isso
              — não com mais uma planilha, mas com um sistema que lembra, organiza e mostra o quadro
              completo por você.
            </p>
          </div>
        </section>

        {/* Como ajuda */}
        <section className="px-6 py-16">
          <div className="mx-auto max-w-6xl">
            <h2
              className="mb-10 text-2xl text-brand-deep sm:text-3xl"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              Como o VortCon ajuda no seu dia a dia
            </h2>

            <div className="mb-16 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
              <div className="order-2 lg:order-1">
                <Bell className="mb-3 h-6 w-6 text-brand-flow" aria-hidden="true" />
                <h3 className="mb-2 text-lg font-semibold text-ink-primary">
                  Nunca mais esqueça um vencimento
                </h3>
                <p className="text-ink-secondary">
                  Marca um lançamento pra te avisar e o VortCon lembra por você — direto no
                  aparelho, na hora certa, sem precisar abrir o app pra checar.
                </p>
              </div>
              <div className="order-1 flex justify-center lg:order-2">
                <TransactionsMockup />
              </div>
            </div>

            <div className="mb-16 grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
              <div className="flex justify-center">
                <CockpitMockup />
              </div>
              <div>
                <PieChart className="mb-3 h-6 w-6 text-brand-flow" aria-hidden="true" />
                <h3 className="mb-2 text-lg font-semibold text-ink-primary">
                  Veja o mês inteiro, de um jeito só
                </h3>
                <p className="text-ink-secondary">
                  O Cockpit mensal junta receitas, despesas e resultado num único lugar — comparado
                  com o mês anterior, sem você precisar somar nada na mão.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
              <div className="order-2 lg:order-1">
                <ShieldCheck className="mb-3 h-6 w-6 text-brand-flow" aria-hidden="true" />
                <h3 className="mb-2 text-lg font-semibold text-ink-primary">
                  Relatórios prontos pra exportar
                </h3>
                <p className="text-ink-secondary">
                  Filtre por período, categoria ou conta e baixe em PDF ou Excel — pronto pra
                  guardar, imprimir ou mandar pro seu contador.
                </p>
              </div>
              <div className="order-1 flex justify-center lg:order-2">
                <ReportsMockup />
              </div>
            </div>
          </div>
        </section>

        {/* Confiança */}
        <section className="border-t border-ink-secondary/10 bg-brand-deep px-6 py-16 text-white">
          <div className="mx-auto max-w-3xl text-center">
            <Fingerprint className="mx-auto mb-4 h-8 w-8 text-brand-flow" aria-hidden="true" />
            <h2
              className="mb-4 text-2xl sm:text-3xl"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              Seus dados financeiros, só seus.
            </h2>
            <p className="text-white/80">
              Login por biometria no seu aparelho, backup dos seus dados sempre que quiser, e nenhum
              dado financeiro seu compartilhado entre contas. O VortCon foi construído pra ser tão
              seguro quanto o banco que você já confia.
            </p>
          </div>
        </section>

        {/* CTA final */}
        <section className="px-6 py-16">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-4 text-center">
            <h2
              className="text-2xl text-brand-deep sm:text-3xl"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              Pronto para organizar seu dinheiro?
            </h2>
            <Link
              href="/planos"
              className="rounded-md bg-brand-deep px-8 py-3 text-sm font-medium text-white hover:bg-brand-deep/90"
            >
              Ver planos
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
