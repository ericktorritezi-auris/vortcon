'use client';

import {
  ArrowLeftRight,
  Bell,
  CreditCard,
  Download,
  Fingerprint,
  Gauge,
  LayoutGrid,
  ListChecks,
  PieChart,
  Tag,
  User,
} from 'lucide-react';

interface HelpSection {
  id: string;
  icon: typeof Gauge;
  title: string;
  items: { question: string; answer: React.ReactNode }[];
}

const SECTIONS: HelpSection[] = [
  {
    id: 'contas',
    icon: CreditCard,
    title: 'Contas',
    items: [
      {
        question: 'Como eu crio uma conta?',
        answer:
          'Vá em Contas, no menu, e clique em "Nova conta". Preencha o nome, escolha o tipo e informe o saldo inicial na data que você quer começar a acompanhar.',
      },
      {
        question: 'Posso mudar o saldo inicial depois?',
        answer:
          'Sim. Abra a conta e altere o saldo inicial — o VortCon pede uma confirmação, porque isso recalcula todo o histórico daquela conta a partir da nova data/valor informados.',
      },
    ],
  },
  {
    id: 'categorias-tags',
    icon: LayoutGrid,
    title: 'Categorias e tags',
    items: [
      {
        question: 'Qual a diferença entre categoria e tag?',
        answer:
          'Categoria é única por lançamento (ex.: "Moradia", "Saúde") e aparece nos relatórios e no Cockpit. Tag é livre e um lançamento pode ter várias ao mesmo tempo (ex.: "reembolsável", "urgente") — serve pra marcar e filtrar, não pra classificar o tipo de gasto.',
      },
      {
        question: 'Como eu crio uma categoria ou tag?',
        answer: 'Vá em Categorias ou em Tags, no menu, e clique em "Nova categoria" ou "Nova tag".',
      },
      {
        question: 'Posso apagar uma categoria ou tag?',
        answer:
          'Não é possível excluir de forma definitiva — só inativar. Isso existe de propósito: apagar apagaria também o histórico de todas as transações que usam aquela categoria/tag, o que nunca é o que você realmente quer.',
      },
    ],
  },
  {
    id: 'transacoes',
    icon: ListChecks,
    title: 'Transações (receitas e despesas)',
    items: [
      {
        question: 'Como eu lanço uma receita ou despesa?',
        answer:
          'Vá em Transações e clique em "Nova receita" ou "Nova despesa". Preencha descrição, valor, vencimento, conta e, se quiser, categoria, tags e observação.',
      },
      {
        question: 'Como marco uma transação como paga ou recebida?',
        answer:
          'Clique na transação pra abrir os detalhes. No topo, tem um botão "Marcar como paga" (despesa) ou "Marcar como recebida" (receita) — isso é diferente de editar: você pode marcar como paga sem mudar mais nada.',
      },
      {
        question: 'Marquei como paga por engano — como eu desfaço?',
        answer:
          'Abra a mesma transação. O botão que antes dizia "Marcar como paga" agora mostra o status atual — clique de novo pra voltar pra pendente. Isso nunca cancela a transação, só desfaz a liquidação.',
      },
      {
        question: 'Qual a diferença entre cancelar e desfazer o pagamento?',
        answer:
          'Desfazer o pagamento volta a transação pra pendente (ainda vai vencer, ainda precisa ser paga). Cancelar marca que ela não vai mais acontecer — mas nunca é apagada do histórico, só fica marcada como cancelada. Você pode reativar uma transação cancelada, se precisar.',
      },
      {
        question: 'Para que serve o "Lembrete"?',
        answer:
          'Ao criar ou editar uma transação, ative o toggle "Lembrete". No dia do vencimento, o VortCon te avisa (dentro do app e por notificação push, se você tiver ativado) — sem precisar checar o app.',
      },
    ],
  },
  {
    id: 'transferencias',
    icon: ArrowLeftRight,
    title: 'Transferências',
    items: [
      {
        question: 'Como eu transfiro entre duas contas?',
        answer:
          'Vá em Transferências e clique em "Nova transferência". Escolha a conta de origem, a de destino e o valor.',
      },
      {
        question: 'Por que a transferência não aparece como receita ou despesa?',
        answer:
          'Porque ela não é nem uma coisa nem outra — dinheiro só está mudando de lugar dentro das suas próprias contas, então nunca deveria distorcer o seu resultado do mês.',
      },
      {
        question: 'O que significa "transferida" e como eu desfaço?',
        answer:
          'Uma transferência pendente ainda não moveu o saldo real entre as contas. Clique nela e use o toggle "Marcar como transferida" pra confirmar que o dinheiro já saiu de uma conta e entrou na outra — e pra desfazer, é o mesmo toggle, na direção contrária.',
      },
    ],
  },
  {
    id: 'cockpit',
    icon: Gauge,
    title: 'Cockpit',
    items: [
      {
        question: 'O que o Cockpit mostra?',
        answer:
          'O resumo do mês inteiro: receitas, despesas, resultado, comparação com o mês anterior e os destaques por categoria — tudo num painel só, sem você precisar somar nada na mão.',
      },
      {
        question: 'Como eu vejo um mês diferente?',
        answer:
          'Use as flechas ao lado do nome do mês, no topo da página, pra navegar entre os meses.',
      },
    ],
  },
  {
    id: 'relatorios',
    icon: PieChart,
    title: 'Relatórios',
    items: [
      {
        question: 'Como eu filtro um relatório?',
        answer:
          'Na página de Relatórios, escolha entre "Mês" ou "Período" (uma data De/Até personalizada), e filtre por categoria, conta, tag, status ou natureza (receita/despesa), se quiser.',
      },
      {
        question: 'Como eu exporto em PDF ou Excel?',
        answer:
          'Com os filtros aplicados, use os botões "PDF" e "Excel" no topo da página. O arquivo já sai com exatamente os mesmos filtros que você está vendo na tela.',
      },
      {
        question: 'Se eu filtrar mais de um mês, como fica a lista?',
        answer:
          'Sempre dividida por mês, com o resumo de cada mês antes das transações daquele mês.',
      },
    ],
  },
  {
    id: 'notificacoes',
    icon: Bell,
    title: 'Notificações',
    items: [
      {
        question: 'Onde eu vejo minhas notificações?',
        answer:
          'No sino, no topo da tela. Um número vermelho aparece quando tem notificação não lida; clique numa notificação pra marcar como lida e ir direto pro lugar relacionado a ela.',
      },
      {
        question: 'Como eu ativo notificações push?',
        answer:
          'Clique no sino e depois em "Ativar notificações push neste dispositivo". Seu navegador vai pedir permissão — sem essa permissão, o push não funciona, mas as notificações continuam aparecendo normalmente dentro do app.',
      },
    ],
  },
  {
    id: 'perfil',
    icon: User,
    title: 'Meu perfil',
    items: [
      {
        question: 'Como eu troco meus dados (nome, telefone, data de nascimento)?',
        answer:
          'Vá em Meu perfil, no menu. E-mail e usuário não podem ser alterados por lá — são o que vincula sua conta.',
      },
      {
        question: 'Como eu troco minha senha?',
        answer:
          'Em Meu perfil, na seção "Alterar senha" — você precisa informar a senha atual pra confirmar a troca.',
      },
    ],
  },
  {
    id: 'biometria',
    icon: Fingerprint,
    title: 'Biometria',
    items: [
      {
        question: 'Como eu ativo o login por biometria?',
        answer:
          'Se você instalou o VortCon como app no seu celular, a tela de login sugere ativar biometria depois que você entra com usuário e senha. Você também pode ativar depois, em Meu perfil, na seção "Biometria".',
      },
      {
        question: 'Troquei de celular e perdi a biometria — e agora?',
        answer:
          'Entre com usuário e senha normalmente, vá em Meu perfil e remova a biometria antiga (na lista de dispositivos) — depois clique em "Ativar nova biometria neste aparelho" pra cadastrar a do celular novo.',
      },
    ],
  },
  {
    id: 'backup',
    icon: Download,
    title: 'Backup',
    items: [
      {
        question: 'Como eu baixo uma cópia dos meus dados?',
        answer:
          'Em Meu perfil, na seção "Backup dos meus dados", clique em "Baixar backup". O arquivo tem todas as suas contas, categorias, tags, transações e transferências — nunca sua senha ou dado de outra pessoa.',
      },
    ],
  },
  {
    id: 'tags-legenda',
    icon: Tag,
    title: 'Ainda com dúvida?',
    items: [
      {
        question: 'Não encontrei o que eu precisava aqui.',
        answer: 'Entre em contato com quem administra sua conta VortCon pra receber ajuda direta.',
      },
    ],
  },
];

/**
 * Manual passo a passo (pedido do cliente) — cobre só o que realmente
 * existe como tela navegável no painel. Formato de referência (perguntas
 * expansíveis), texto puro, sem imagem — ao contrário das páginas
 * públicas do Estágio 16A.
 */
export function HelpContent(): React.ReactElement {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-ink-primary">Ajuda</h1>
        <p className="text-sm text-ink-secondary">
          Um manual rápido de como usar cada parte do VortCon.
        </p>
      </div>

      <nav
        aria-label="Sumário"
        className="flex flex-wrap gap-2 rounded-lg border border-ink-secondary/15 bg-white p-3"
      >
        {SECTIONS.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-full bg-surface-page px-3 py-1.5 text-xs font-medium text-ink-secondary hover:bg-brand-flow/10 hover:text-brand-flow"
          >
            {section.title}
          </a>
        ))}
      </nav>

      <div className="flex flex-col gap-6">
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="rounded-lg border border-ink-secondary/15 bg-white p-4"
          >
            <div className="mb-3 flex items-center gap-2">
              <section.icon className="h-5 w-5 text-brand-flow" aria-hidden="true" />
              <h2 className="text-base font-semibold text-ink-primary">{section.title}</h2>
            </div>
            <div className="flex flex-col divide-y divide-ink-secondary/10">
              {section.items.map((item) => (
                <details key={item.question} className="group py-2.5">
                  <summary className="cursor-pointer list-none text-sm font-medium text-ink-primary marker:content-none">
                    {item.question}
                  </summary>
                  <p className="mt-2 text-sm text-ink-secondary">{item.answer}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
