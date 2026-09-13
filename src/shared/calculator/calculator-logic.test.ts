import { describe, expect, it } from 'vitest';
import { calculatorReducer, INITIAL_CALCULATOR_STATE } from './calculator-logic';
import type { CalculatorState } from './calculator-logic';

function digit(state: CalculatorState, value: string): CalculatorState {
  return calculatorReducer(state, { type: 'DIGIT', digit: value });
}
function type(state: CalculatorState, digits: string): CalculatorState {
  return digits.split('').reduce(digit, state);
}

describe('calculatorReducer (evolução v1.4 — calculadora normal)', () => {
  it('soma simples: 5 + 3 = 8', () => {
    let state = INITIAL_CALCULATOR_STATE;
    state = type(state, '5');
    state = calculatorReducer(state, { type: 'OPERATOR', operator: '+' });
    state = type(state, '3');
    state = calculatorReducer(state, { type: 'EQUALS' });
    expect(state.display).toBe('8');
  });

  it('as quatro operações básicas', () => {
    const cases: [string, '+' | '-' | '×' | '÷', string, string][] = [
      ['10', '+', '5', '15'],
      ['10', '-', '5', '5'],
      ['10', '×', '5', '50'],
      ['10', '÷', '5', '2'],
    ];
    for (const [a, op, b, expected] of cases) {
      let state = INITIAL_CALCULATOR_STATE;
      state = type(state, a);
      state = calculatorReducer(state, { type: 'OPERATOR', operator: op });
      state = type(state, b);
      state = calculatorReducer(state, { type: 'EQUALS' });
      expect(state.display).toBe(expected);
    }
  });

  it('encadeamento: 5 + 3 + 2 = calcula o parcial ao trocar de operador (10), depois fecha em 12', () => {
    let state = INITIAL_CALCULATOR_STATE;
    state = type(state, '5');
    state = calculatorReducer(state, { type: 'OPERATOR', operator: '+' });
    state = type(state, '3');
    state = calculatorReducer(state, { type: 'OPERATOR', operator: '+' });
    expect(state.display).toBe('8'); // 5+3 já calculado ao trocar de operador
    state = type(state, '2');
    state = calculatorReducer(state, { type: 'EQUALS' });
    expect(state.display).toBe('10');
  });

  it('ponto flutuante nunca aparece sujo: 0.1 + 0.2 = 0.3, nunca 0.30000000000000004', () => {
    let state = INITIAL_CALCULATOR_STATE;
    state = calculatorReducer(state, { type: 'DIGIT', digit: '0' });
    state = calculatorReducer(state, { type: 'DECIMAL' });
    state = calculatorReducer(state, { type: 'DIGIT', digit: '1' });
    state = calculatorReducer(state, { type: 'OPERATOR', operator: '+' });
    state = calculatorReducer(state, { type: 'DIGIT', digit: '0' });
    state = calculatorReducer(state, { type: 'DECIMAL' });
    state = calculatorReducer(state, { type: 'DIGIT', digit: '2' });
    state = calculatorReducer(state, { type: 'EQUALS' });
    expect(state.display).toBe('0.3');
  });

  it('percentual: 50% vira 0.5', () => {
    let state = INITIAL_CALCULATOR_STATE;
    state = type(state, '50');
    state = calculatorReducer(state, { type: 'PERCENT' });
    expect(state.display).toBe('0.5');
  });

  it('divisão por zero mostra "Erro", nunca quebra nem trava a calculadora', () => {
    let state = INITIAL_CALCULATOR_STATE;
    state = type(state, '10');
    state = calculatorReducer(state, { type: 'OPERATOR', operator: '÷' });
    state = type(state, '0');
    state = calculatorReducer(state, { type: 'EQUALS' });
    expect(state.display).toBe('Erro');

    // Depois do erro, digitar um número novo começa do zero, nunca trava.
    state = calculatorReducer(state, { type: 'DIGIT', digit: '7' });
    expect(state.display).toBe('7');
  });

  it('inverter sinal (+/-)', () => {
    let state = type(INITIAL_CALCULATOR_STATE, '5');
    state = calculatorReducer(state, { type: 'TOGGLE_SIGN' });
    expect(state.display).toBe('-5');
    state = calculatorReducer(state, { type: 'TOGGLE_SIGN' });
    expect(state.display).toBe('5');
  });

  it('ponto decimal nunca duplica', () => {
    let state = type(INITIAL_CALCULATOR_STATE, '1');
    state = calculatorReducer(state, { type: 'DECIMAL' });
    state = calculatorReducer(state, { type: 'DECIMAL' }); // segunda vez, ignorado
    state = type(state, '5');
    expect(state.display).toBe('1.5');
  });

  it('limpar (C) sempre volta pro estado inicial, mesmo no meio de uma conta', () => {
    let state = type(INITIAL_CALCULATOR_STATE, '99');
    state = calculatorReducer(state, { type: 'OPERATOR', operator: '+' });
    state = calculatorReducer(state, { type: 'CLEAR' });
    expect(state).toEqual(INITIAL_CALCULATOR_STATE);
  });

  it('continuar operando em cima do resultado (5+3=8, depois +2=10)', () => {
    let state = INITIAL_CALCULATOR_STATE;
    state = type(state, '5');
    state = calculatorReducer(state, { type: 'OPERATOR', operator: '+' });
    state = type(state, '3');
    state = calculatorReducer(state, { type: 'EQUALS' });
    expect(state.display).toBe('8');

    state = calculatorReducer(state, { type: 'OPERATOR', operator: '+' });
    state = type(state, '2');
    state = calculatorReducer(state, { type: 'EQUALS' });
    expect(state.display).toBe('10');
  });

  it('nunca deixa passar de 15 dígitos', () => {
    const state = type(INITIAL_CALCULATOR_STATE, '9999999999999999999');
    expect(state.display.length).toBeLessThanOrEqual(15);
  });
});
