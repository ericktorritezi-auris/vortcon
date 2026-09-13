/**
 * Calculadora (pedido do cliente, evolução v1.4) — lógica pura, sem
 * nenhuma dependência de React ou do DOM, pra poder ser testada de
 * verdade. Calculadora normal: soma, subtração, multiplicação, divisão,
 * percentual — nunca científica, nunca financeira.
 */

export type Operator = '+' | '-' | '×' | '÷';

export interface CalculatorState {
  display: string;
  previousValue: number | null;
  pendingOperator: Operator | null;
  awaitingNewValue: boolean;
}

export type CalculatorAction =
  | { type: 'DIGIT'; digit: string }
  | { type: 'DECIMAL' }
  | { type: 'OPERATOR'; operator: Operator }
  | { type: 'EQUALS' }
  | { type: 'PERCENT' }
  | { type: 'TOGGLE_SIGN' }
  | { type: 'CLEAR' };

export const INITIAL_CALCULATOR_STATE: CalculatorState = {
  display: '0',
  previousValue: null,
  pendingOperator: null,
  awaitingNewValue: false,
};

const MAX_DIGITS = 15;

function computeResult(a: number, b: number, operator: Operator): number {
  switch (operator) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      return b === 0 ? NaN : a / b;
  }
}

/** Arredonda pra 10 casas decimais — evita sujeira de ponto flutuante (0.1 + 0.2 = 0.30000000000000004 em JS puro). */
function roundResult(value: number): number {
  return Math.round(value * 1e10) / 1e10;
}

function formatNumber(value: number): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 'Erro';
  return String(value);
}

export function calculatorReducer(
  state: CalculatorState,
  action: CalculatorAction,
): CalculatorState {
  switch (action.type) {
    case 'CLEAR':
      return INITIAL_CALCULATOR_STATE;

    case 'DIGIT': {
      if (state.display === 'Erro') {
        return { ...INITIAL_CALCULATOR_STATE, display: action.digit };
      }
      if (state.awaitingNewValue) {
        return { ...state, display: action.digit, awaitingNewValue: false };
      }
      if (state.display === '0') {
        return { ...state, display: action.digit };
      }
      const digitsOnly = state.display.replace('-', '').replace('.', '');
      if (digitsOnly.length >= MAX_DIGITS) return state;
      return { ...state, display: state.display + action.digit };
    }

    case 'DECIMAL': {
      if (state.display === 'Erro') {
        return { ...INITIAL_CALCULATOR_STATE, display: '0.' };
      }
      if (state.awaitingNewValue) {
        return { ...state, display: '0.', awaitingNewValue: false };
      }
      if (state.display.includes('.')) return state;
      return { ...state, display: `${state.display}.` };
    }

    case 'TOGGLE_SIGN': {
      if (state.display === '0' || state.display === 'Erro') return state;
      return {
        ...state,
        display: state.display.startsWith('-') ? state.display.slice(1) : `-${state.display}`,
      };
    }

    case 'PERCENT': {
      if (state.display === 'Erro') return state;
      const value = roundResult(parseFloat(state.display) / 100);
      return { ...state, display: formatNumber(value) };
    }

    case 'OPERATOR': {
      if (state.display === 'Erro') return state;
      const currentValue = parseFloat(state.display);

      if (state.pendingOperator !== null && !state.awaitingNewValue) {
        const result = roundResult(
          computeResult(state.previousValue!, currentValue, state.pendingOperator),
        );
        return {
          display: formatNumber(result),
          previousValue: Number.isNaN(result) ? null : result,
          pendingOperator: Number.isNaN(result) ? null : action.operator,
          awaitingNewValue: true,
        };
      }

      return {
        ...state,
        previousValue: currentValue,
        pendingOperator: action.operator,
        awaitingNewValue: true,
      };
    }

    case 'EQUALS': {
      if (state.display === 'Erro') return state;
      if (state.pendingOperator === null || state.previousValue === null) return state;
      const currentValue = parseFloat(state.display);
      const result = roundResult(
        computeResult(state.previousValue, currentValue, state.pendingOperator),
      );
      return {
        display: formatNumber(result),
        previousValue: null,
        pendingOperator: null,
        awaitingNewValue: true,
      };
    }
  }
}
