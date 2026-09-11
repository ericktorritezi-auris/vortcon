'use client';

import {
  ArrowLeftRight,
  Bell,
  CalendarClock,
  CreditCard,
  Download,
  Fingerprint,
  Gauge,
  LayoutGrid,
  ListChecks,
  PieChart,
  Repeat,
  Search,
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
      {
        question: 'Posso editar nome e tipo de uma conta depois de criada?',
        answer: 'Sim. Clique em "Editar" na conta desejada e altere nome e/ou tipo livremente.',
      },
      {
        question: 'Posso inativar uma conta que não uso mais?',
        answer:
          'Sim. Clique em "Inativar" — ela continua na sua listagem (marcada como "Inativa", pra você não perder o histórico de vista) e some dos seletores de conta ao criar um lançamento novo. Pode reativar quando quiser.',
      },
      {
        question: 'Posso excluir uma conta de vez?',
        answer:
          'Só se ela nunca tiver sido usada em nenhum lançamento, transferência ou recorrência. Se tiver qualquer vínculo, o VortCon bloqueia a exclusão e sugere inativar em vez disso — assim seu histórico nunca é destruído por engano.',
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
        question: 'Posso editar o nome ou o ícone de uma categoria?',
        answer:
          'Sim. Clique em "Editar" na categoria e altere o nome e/ou o ícone livremente — inclusive pros ícones mais recentes (esporte, saúde, trabalho, combustível, entre outros).',
      },
      {
        question: 'Posso apagar uma categoria ou tag?',
        answer:
          'Depende: se ela nunca tiver sido usada em nenhum lançamento, sim — exclusão de verdade, some do banco. Se já tiver histórico vinculado, o VortCon bloqueia a exclusão e oferece "Inativar" em vez disso — ela continua aparecendo nos lançamentos antigos que já usam ela (marcada como inativa), só some do seletor pra lançamento novo.',
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
        question: 'Depois de cancelar, posso excluir a transação de vez?',
        answer:
          'Sim. Uma transação cancelada ganha a opção "Excluir" — aí sim ela some do banco de verdade, sem volta. Enquanto ainda está ativa (não cancelada), não dá pra excluir direto, só cancelar primeiro. Isso existe pra nunca apagar por engano algo que ainda está em uso.',
      },
      {
        question: 'Para que serve o "Lembrete"?',
        answer:
          'Ao criar ou editar uma transação, ative o toggle "Lembrete". No dia do vencimento, o VortCon te avisa (dentro do app e por notificação push, se você tiver ativado) — sem precisar checar o app.',
      },
      {
        question: 'O que é o toggle "Influencia no saldo das contas"?',
        answer:
          'Por padrão, toda transação conta no saldo real da conta — é assim que o VortCon sempre funcionou. Mas às vezes você quer registrar algo só como histórico, sem que aquele valor mexa no saldo de verdade da conta — por exemplo, um lançamento antigo de antes de você começar a usar o VortCon, que você quer ter registrado mas que já está "resolvido" há muito tempo e não deveria alterar o saldo atual. Nesses casos, desative esse toggle: a transação continua aparecendo normalmente nos seus relatórios, categorias e no resultado do período — só não entra na conta de "quanto dinheiro tem de verdade" nas suas contas. Dá pra mudar isso a qualquer momento, editando a transação — inclusive numa recorrência, você pode ter algumas parcelas influenciando o saldo e outras não, ajustando cada ocorrência individualmente.',
      },
      {
        question: 'Como eu crio uma receita ou despesa recorrente (aluguel, salário, assinatura)?',
        answer:
          'Ao criar a receita ou despesa, ative o toggle "Receita recorrente" ou "Despesa recorrente". Escolha a frequência (diária, semanal, mensal ou anual) e, se quiser, quando ela termina (por data ou por número de vezes) — se não preencher nenhum dos dois, ela continua até você encerrar manualmente. O VortCon já cria os próximos lançamentos automaticamente, com uma boa antecedência (cerca de 13 meses pra frente) — e essa "janela" vai sempre andando junto com o calendário, então uma recorrência sem fim nunca "seca".',
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
      {
        question: 'Posso editar, cancelar ou excluir uma transferência?',
        answer:
          'Sim, os três. "Editar" muda valor, contas, data ou observação. "Cancelar" marca que ela não vai mais acontecer, sem apagar (mesmo padrão de Transações). Depois de cancelada, aparece a opção "Excluir", que sim apaga de vez — só funciona depois de cancelada, nunca numa transferência ainda ativa.',
      },
      {
        question: 'Como eu crio uma transferência recorrente (ex.: aporte mensal)?',
        answer:
          'Ao criar a transferência, ative o toggle "Transferência recorrente" e escolha a frequência. Assim como nas transações recorrentes, você pode definir quando ela termina, ou deixar em aberto até encerrar manualmente.',
      },
    ],
  },
  {
    id: 'recorrencias',
    icon: Repeat,
    title: 'Recorrências',
    items: [
      {
        question: 'Pra que serve a tela de Recorrências?',
        answer:
          'É onde você vê, de uma vez, todas as suas transações e transferências recorrentes — aluguel, assinatura, salário, aporte mensal, o que for. Cada uma mostra a frequência, a conta usada, quando começou e termina (se tiver data marcada), e quantos lançamentos ela já gerou.',
      },
      {
        question:
          'Criei uma recorrência errada e lancei um monte de coisa sem querer — como eu limpo isso rápido?',
        answer:
          'Na tela de Recorrências, marque a(s) série(s) que quer remover (ou "Selecionar todas") e clique em "Excluir selecionadas". Isso apaga a série inteira de uma vez, com todos os lançamentos que ela já gerou — pagos, pendentes, cancelados, todos — sem você precisar entrar em cada lançamento individualmente e excluir um por um.',
      },
    ],
  },
  {
    id: 'busca',
    icon: Search,
    title: 'Busca',
    items: [
      {
        question: 'Como eu busco alguma coisa no VortCon?',
        answer:
          'Use o campo de busca no topo da tela (ao lado do sino de notificações). Digite pelo menos 2 letras e um menu com os resultados aparece embaixo, sem precisar apertar Enter.',
      },
      {
        question: 'O que a busca encontra?',
        answer:
          'Transações (pela descrição), contas, categorias e tags — tudo que já existe no seu painel. Clique num resultado pra ir direto pra tela relacionada.',
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
    id: 'programacoes',
    icon: CalendarClock,
    title: 'Programações',
    items: [
      {
        question: 'O que é Programações e por que ele existe?',
        answer:
          'É um espaço separado das suas finanças de verdade, pra você organizar compromissos, previsões e combinados antes de decidir se e quando eles vão virar dinheiro de fato. A ideia surgiu de uma necessidade bem prática: você lida com valores a receber ou a pagar que envolvem terceiros — repasses, acordos, empréstimos — e quer acompanhar isso tudo organizado, sem que cada anotação bagunce seu saldo, seus relatórios ou o resultado do seu mês antes da hora. Enquanto um item estiver só em Programações, ele nunca conta em nada financeiro — nem saldo, nem Cockpit, nem relatório. A regra é simples de lembrar: programar não é movimentar dinheiro.',
      },
      {
        question: 'Então como o dinheiro passa de Programações pras minhas finanças de verdade?',
        answer:
          'Só de um jeito, e só quando você decide: clicando em "Gerar transação". Nesse momento (e só nesse momento) o VortCon cria uma Receita ou Despesa de verdade, pelo mesmo caminho oficial de sempre — a partir daí, aquele valor passa a contar no seu saldo, no Cockpit, nos relatórios, tudo normal. Antes disso, é só um registro organizado, sem nenhum efeito financeiro.',
      },
      {
        question: 'O que são "Origem" e "Beneficiário"?',
        answer:
          'Beneficiário é a pessoa, empresa ou instituição envolvida — "Ana Paula", "Itaú", "Mercado Pago". Origem é um jeito opcional de classificar de onde vem ou pra onde vai aquele compromisso — "Empréstimo", "Financiamento", "Repasse", "Acordo" — sem carregar significado financeiro fixo (o mesmo tipo de Origem pode virar receita numa vez e despesa noutra, dependendo do lançamento). Cadastre os dois em Programações > Origens e Programações > Beneficiários antes de lançar — Beneficiário é obrigatório em todo lançamento, Origem é opcional.',
      },
      {
        question: 'Como eu crio um lançamento de Programação?',
        answer:
          'Vá em Programações > Lançamentos, escolha o mês (a navegação funciona igual à de Transações) e clique em "Nova receita" ou "Nova despesa". Preencha beneficiário, origem (se quiser), descrição, valor e data. Repare que não tem campo de conta, categoria, tag nem "pago/recebido" — esses conceitos são só de Transações; aqui é um controle mais simples, de propósito.',
      },
      {
        question: 'Por que os lançamentos aparecem agrupados por beneficiário, e não por data?',
        answer:
          'Porque normalmente você quer saber "quanto eu tenho pra receber/pagar de tal pessoa ou empresa este mês", não "o que venceu tal dia". Dentro de cada beneficiário, receitas e despesas ficam sempre separadas — o VortCon nunca soma uma com a outra pra mostrar um "líquido". Se Ana Paula te deve R$ 1.000 e você deve R$ 300 pra ela, isso aparece como dois grupos distintos, nunca como R$ 700.',
      },
      {
        question: 'Como funciona o "Gerar transação" na prática?',
        answer:
          'Em cada grupo de receita ou despesa de um beneficiário, aparece um botão "Gerar transação (X)", com X sendo quantos lançamentos daquele grupo ainda não foram convertidos. Ao clicar, o VortCon soma automaticamente TODOS eles — nunca dá pra escolher só uma parte — e mostra o total, uma descrição sugerida (que você pode editar), e pede a conta e a data da transação de verdade. Ao confirmar, nasce uma única Receita ou Despesa consolidada, e todos aqueles lançamentos de Programação ficam marcados como já convertidos.',
      },
      {
        question: 'Posso gerar a mesma Programação duas vezes por engano?',
        answer:
          'Não. Depois de convertido, um lançamento nunca aparece de novo como elegível pra gerar transação — mesmo que, por algum motivo, a transação gerada seja excluída depois. O vínculo entre a Programação e a Transação que ela originou é preservado pra sempre, mesmo que a transação em si deixe de existir.',
      },
      {
        question: 'Posso editar um lançamento depois que ele já gerou uma transação?',
        answer:
          'Não — nesse ponto, Programação e Transação já são registros independentes. Se precisar corrigir algo, edite a Transação gerada normalmente (em Transações), não a Programação original. Você ainda pode cancelar a Programação convertida, se quiser (isso nunca afeta a Transação já criada), mas não pode mais editá-la, reativá-la ou excluí-la.',
      },
      {
        question: 'Como funciona o cancelamento e a exclusão de um lançamento de Programação?',
        answer:
          'Mesmo padrão de Transações: ativo → cancelar → excluir. Cancelar preserva o registro (marcado como cancelado, sai das contagens); só depois de cancelado é que aparece a opção de excluir de vez. Se o lançamento já tiver gerado uma transação, ele nunca pode ser excluído (só cancelado) — isso protege a rastreabilidade de qual Programação originou qual Transação.',
      },
      {
        question: 'Como funciona a recorrência dentro de Programações?',
        answer:
          'Exatamente igual à recorrência de Transações (mesma tela, mesmas opções de frequência) — só que gera Lançamentos de Programação, nunca Transações automaticamente. Numa recorrência com número de vezes definido, cada ocorrência mostra sua posição (ex.: "3/10").',
      },
      {
        question: 'Criei uma recorrência de Programação errada — como excluo tudo de uma vez?',
        answer:
          'Vá em Programações > Recorrências — mesmo conceito da tela de Recorrências financeiras, mas separada, só com séries de Programações. Selecione a(s) série(s) e clique em "Excluir selecionadas". Uma diferença importante aqui: qualquer ocorrência que já tenha gerado uma transação é sempre preservada, mesmo que você exclua a série inteira — só as ocorrências ainda não convertidas somem junto com a série.',
      },
      {
        question: 'Posso excluir uma Origem ou Beneficiário?',
        answer:
          'Só se não tiver nenhum lançamento vinculado a ele — mesma regra de Categorias e Contas. Se já tiver histórico, o VortCon bloqueia a exclusão e oferece "Inativar" em vez disso.',
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
