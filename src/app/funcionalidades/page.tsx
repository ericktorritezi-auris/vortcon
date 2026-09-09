import { Bell, Download, Fingerprint, Smartphone } from 'lucide-react';
import { Footer, Header } from '@/shared/ui';
import { fraunces } from '@/shared/marketing/fonts';
import {
  CockpitMockup,
  ReportsMockup,
  TransactionsMockup,
} from '@/shared/marketing/ProductMockups';

export const metadata = {
  title: 'Funcionalidades — VortCon',
  description:
    'Do lançamento ao relatório: veja como o VortCon organiza sua vida financeira de ponta a ponta.',
};

interface Step {
  number: string;
  title: string;
  description: string;
  mockup: React.ReactNode;
}

const STEPS: Step[] = [
  {
    number: '01',
    title: 'Lance receitas e despesas em segundos',
    description:
      'Descrição, valor, conta, categoria e tag — tudo num só lugar. Marca como recorrente e o VortCon lança os próximos meses por você.',
    mockup: <TransactionsMockup />,
  },
  {
    number: '02',
    title: 'Transfira entre contas sem distorcer seu resultado',
    description:
      'Transferência nunca conta como receita ou despesa. Pendente não altera o saldo real; só quando você confirma que o dinheiro realmente saiu de uma conta e entrou na outra.',
    mockup: <TransactionsMockup />,
  },
  {
    number: '03',
    title: 'Acompanhe o mês inteiro no Cockpit',
    description:
      'Receitas, despesas, resultado e comparação com o mês anterior, tudo num painel só — sem precisar somar nada na mão.',
    mockup: <CockpitMockup />,
  },
  {
    number: '04',
    title: 'Exporte relatórios prontos pra guardar ou enviar',
    description:
      'Filtre por período, categoria, conta ou tag. Baixe em PDF pra imprimir ou em Excel pra continuar analisando — ou mande direto pro seu contador.',
    mockup: <ReportsMockup />,
  },
];

const EXTRA_FEATURES = [
  {
    icon: Bell,
    title: 'Lembretes automáticos',
    description:
      'Marque "lembrar vencimento" num lançamento e receba o aviso na hora certa — sem precisar checar o app.',
  },
  {
    icon: Fingerprint,
    title: 'Login por biometria',
    description:
      'Face ID, Touch ID ou digital do Android — entre sem digitar senha, com a mesma segurança de sempre.',
  },
  {
    icon: Smartphone,
    title: 'Instale como um app',
    description:
      'Adicione o VortCon à tela inicial do seu celular — funciona como um aplicativo de verdade, sem loja de apps.',
  },
  {
    icon: Download,
    title: 'Backup dos seus dados',
    description:
      'Baixe uma cópia completa das suas contas, categorias e transações sempre que quiser, num arquivo só seu.',
  },
];

/**
 * Funcionalidades de ponta a ponta do lado do tenant (Seção 136, Estágio
 * 16A) — nunca as funcionalidades do Admin. A sequência de passos é
 * genuinamente sequencial (lançar → transferir → acompanhar → exportar),
 * por isso numerada; as funcionalidades extra abaixo não são uma
 * sequência, por isso sem números.
 */
export default function FuncionalidadesPage(): React.ReactElement {
  return (
    <div className={`flex min-h-screen flex-col ${fraunces.variable}`}>
      <Header />

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-16 text-center lg:py-20">
          <h1
            className="mb-5 text-4xl leading-[1.1] text-brand-deep sm:text-5xl"
            style={{ fontFamily: 'var(--font-fraunces)' }}
          >
            Do lançamento ao relatório, de ponta a ponta.
          </h1>
          <p className="mx-auto max-w-xl text-lg text-ink-secondary">
            Veja exatamente como o VortCon acompanha o seu dinheiro, passo a passo — desde a
            primeira despesa lançada até o relatório pronto pra baixar.
          </p>
        </section>

        <section className="border-t border-ink-secondary/10 bg-white px-6 py-16">
          <div className="mx-auto flex max-w-5xl flex-col gap-16">
            {STEPS.map((step, index) => (
              <div
                key={step.number}
                className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2"
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <span
                    className="mb-2 block text-sm text-brand-flow"
                    style={{ fontFamily: 'var(--font-fraunces)' }}
                  >
                    {step.number}
                  </span>
                  <h2 className="mb-2 text-xl font-semibold text-ink-primary">{step.title}</h2>
                  <p className="text-ink-secondary">{step.description}</p>
                </div>
                <div className={`flex justify-center ${index % 2 === 1 ? 'lg:order-1' : ''}`}>
                  {step.mockup}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <h2
              className="mb-10 text-2xl text-brand-deep sm:text-3xl"
              style={{ fontFamily: 'var(--font-fraunces)' }}
            >
              E também
            </h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
              {EXTRA_FEATURES.map((feature) => (
                <div key={feature.title}>
                  <feature.icon className="mb-3 h-6 w-6 text-brand-flow" aria-hidden="true" />
                  <h3 className="mb-1.5 font-semibold text-ink-primary">{feature.title}</h3>
                  <p className="text-sm text-ink-secondary">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
