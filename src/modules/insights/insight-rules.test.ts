import { describe, expect, it } from 'vitest';
import {
  buildCategoryInsightCandidate,
  computePercentChange,
  selectTopInsights,
} from './insight-rules';

// Intl.NumberFormat('pt-BR', { style: 'currency', ... }) insere um espaço
// NÃO separável (U+00A0) entre "R$" e o valor, não um espaço comum —
// monta as strings esperadas com o mesmo formatador, nunca digitando a
// pontuação de moeda à mão (foi exatamente isso que causou uma falha de
// teste real na primeira versão deste arquivo).
const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

describe('computePercentChange (Seção 92 — nunca gerar infinito)', () => {
  it('calcula a variação normalmente quando há base de comparação', () => {
    expect(computePercentChange(88_000, 100_000)).toBeCloseTo(-12);
  });

  it('retorna null quando o mês anterior é zero — nunca divide por zero', () => {
    expect(computePercentChange(50_000, 0)).toBeNull();
  });

  it('nunca retorna Infinity ou NaN em nenhum cenário', () => {
    const result = computePercentChange(0, 0);
    // 0 anterior já cai no caso "null" acima, então nem chega a calcular.
    expect(result).toBeNull();
  });
});

describe('buildCategoryInsightCandidate (Seção 90-92)', () => {
  it('categoria sem nenhum movimento no período não gera insight', () => {
    const result = buildCategoryInsightCandidate(
      'cat-1',
      'Lazer',
      { incomeCents: 0, expenseCents: 0 },
      { incomeCents: 0, expenseCents: 0 },
    );
    expect(result).toBeNull();
  });

  it('categoria bidirecional (receita E despesa) usa resultado líquido — nunca dois insights separados (Seção 92)', () => {
    // Reproduz o exemplo exato da Seção 91: R$ 8.000 em entradas, R$ 5.000
    // em saídas, resultado líquido R$ 3.000.
    const result = buildCategoryInsightCandidate(
      'cat-1',
      'Empréstimo',
      { incomeCents: 800_000, expenseCents: 500_000 },
      { incomeCents: 0, expenseCents: 0 },
    );
    expect(result?.text).toBe(
      `A categoria Empréstimo registrou ${money.format(8000)} em entradas e ${money.format(5000)} em saídas, com resultado líquido de ${money.format(3000)} no período.`,
    );
  });

  it('só despesa, queda relevante em relação ao mês anterior — nunca confunde com lucro (Seção 92)', () => {
    const result = buildCategoryInsightCandidate(
      'cat-1',
      'Empréstimo',
      { incomeCents: 0, expenseCents: 88_000 },
      { incomeCents: 0, expenseCents: 100_000 },
    );
    expect(result?.text).toBe(
      'As despesas da categoria Empréstimo caíram 12% em relação ao mês anterior.',
    );
    // Nunca menciona lucro, resultado ou qualquer conclusão além da própria despesa.
    expect(result?.text.toLowerCase()).not.toContain('lucro');
  });

  it('só despesa, aumento relevante', () => {
    const result = buildCategoryInsightCandidate(
      'cat-1',
      'Transporte',
      { incomeCents: 0, expenseCents: 150_000 },
      { incomeCents: 0, expenseCents: 100_000 },
    );
    expect(result?.text).toBe(
      'As despesas da categoria Transporte subiram 50% em relação ao mês anterior.',
    );
  });

  it('só receita, sem base de comparação — usa total absoluto, nunca porcentagem inventada', () => {
    const result = buildCategoryInsightCandidate(
      'cat-1',
      'Empréstimo',
      { incomeCents: 2_000_000, expenseCents: 0 },
      { incomeCents: 0, expenseCents: 0 },
    );
    expect(result?.text).toBe(
      `As receitas da categoria Empréstimo totalizaram ${money.format(20000)} neste mês.`,
    );
  });

  it('movimento abaixo do piso de relevância nunca gera variação percentual ruidosa', () => {
    // R$ 1,00 -> R$ 3,00 seria "200%", mas ambos os valores estão muito
    // abaixo do piso — o insight cai pro total absoluto, nunca a porcentagem.
    const result = buildCategoryInsightCandidate(
      'cat-1',
      'Categoria Pequena',
      { incomeCents: 0, expenseCents: 300 },
      { incomeCents: 0, expenseCents: 100 },
    );
    expect(result?.text).not.toContain('%');
    expect(result?.text).toContain('totalizaram');
  });
});

describe('selectTopInsights (Seção 90 — relevância)', () => {
  it('ordena do maior movimento pro menor e corta no limite', () => {
    const candidates = [
      { categoryId: 'a', text: 'A', magnitude: 100 },
      { categoryId: 'b', text: 'B', magnitude: 500 },
      { categoryId: 'c', text: 'C', magnitude: 300 },
    ];
    const result = selectTopInsights(candidates, 2);
    expect(result.map((i) => i.categoryId)).toEqual(['b', 'c']);
  });

  it('nunca retorna mais que o limite, mesmo com muitos candidatos', () => {
    const candidates = Array.from({ length: 10 }, (_, i) => ({
      categoryId: `cat-${i}`,
      text: `Insight ${i}`,
      magnitude: i,
    }));
    expect(selectTopInsights(candidates, 5)).toHaveLength(5);
  });
});
