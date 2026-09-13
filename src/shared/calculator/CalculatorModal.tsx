'use client';

import { useReducer } from 'react';
import { Modal } from '@/shared/ui';
import { calculatorReducer, INITIAL_CALCULATOR_STATE } from './calculator-logic';
import type { Operator } from './calculator-logic';

interface CalculatorModalProps {
  onClose: () => void;
}

/**
 * Calculadora normal (pedido do cliente, evolução v1.4) — suspensa por
 * cima da tela, nunca navega nem mexe em nada do resto do sistema.
 * Soma, subtração, multiplicação, divisão, percentual. Nada científico,
 * nada financeiro — só uma conta rápida de bolso, ex.: conferir o total
 * de uma recorrência antes de confirmar. Estado só existe enquanto o
 * modal está aberto — fecha e reabre sempre zerada, nunca salva nada.
 */
export function CalculatorModal({ onClose }: CalculatorModalProps): React.ReactElement {
  const [state, dispatch] = useReducer(calculatorReducer, INITIAL_CALCULATOR_STATE);

  function pressDigit(digit: string): void {
    dispatch({ type: 'DIGIT', digit });
  }
  function pressOperator(operator: Operator): void {
    dispatch({ type: 'OPERATOR', operator });
  }

  const isOperatorActive = (operator: Operator): boolean =>
    state.pendingOperator === operator && state.awaitingNewValue;

  return (
    <Modal open onClose={onClose} title="Calculadora">
      <div className="flex flex-col gap-3">
        <div
          className="overflow-x-auto rounded-md bg-ink-primary px-4 py-5 text-right font-mono text-3xl text-white"
          aria-live="polite"
        >
          {state.display}
        </div>

        <div className="grid grid-cols-4 gap-2">
          <CalcButton label="C" tone="muted" onClick={() => dispatch({ type: 'CLEAR' })} />
          <CalcButton label="+/-" tone="muted" onClick={() => dispatch({ type: 'TOGGLE_SIGN' })} />
          <CalcButton label="%" tone="muted" onClick={() => dispatch({ type: 'PERCENT' })} />
          <CalcButton
            label="÷"
            tone="operator"
            active={isOperatorActive('÷')}
            onClick={() => pressOperator('÷')}
          />

          <CalcButton label="7" onClick={() => pressDigit('7')} />
          <CalcButton label="8" onClick={() => pressDigit('8')} />
          <CalcButton label="9" onClick={() => pressDigit('9')} />
          <CalcButton
            label="×"
            tone="operator"
            active={isOperatorActive('×')}
            onClick={() => pressOperator('×')}
          />

          <CalcButton label="4" onClick={() => pressDigit('4')} />
          <CalcButton label="5" onClick={() => pressDigit('5')} />
          <CalcButton label="6" onClick={() => pressDigit('6')} />
          <CalcButton
            label="−"
            tone="operator"
            active={isOperatorActive('-')}
            onClick={() => pressOperator('-')}
          />

          <CalcButton label="1" onClick={() => pressDigit('1')} />
          <CalcButton label="2" onClick={() => pressDigit('2')} />
          <CalcButton label="3" onClick={() => pressDigit('3')} />
          <CalcButton
            label="+"
            tone="operator"
            active={isOperatorActive('+')}
            onClick={() => pressOperator('+')}
          />

          <CalcButton label="0" className="col-span-2" onClick={() => pressDigit('0')} />
          <CalcButton label="," onClick={() => dispatch({ type: 'DECIMAL' })} />
          <CalcButton label="=" tone="equals" onClick={() => dispatch({ type: 'EQUALS' })} />
        </div>
      </div>
    </Modal>
  );
}

interface CalcButtonProps {
  label: string;
  onClick: () => void;
  tone?: 'default' | 'muted' | 'operator' | 'equals';
  active?: boolean;
  className?: string;
}

const TONE_CLASSNAME: Record<NonNullable<CalcButtonProps['tone']>, string> = {
  default: 'bg-surface-page text-ink-primary hover:bg-ink-secondary/10',
  muted: 'bg-ink-secondary/10 text-ink-primary hover:bg-ink-secondary/20',
  operator: 'bg-brand-flow/10 text-brand-flow hover:bg-brand-flow/20',
  equals: 'bg-brand-flow text-white hover:bg-brand-flow/90',
};

function CalcButton({
  label,
  onClick,
  tone = 'default',
  active = false,
  className = '',
}: CalcButtonProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md py-3 text-lg font-medium transition-colors ${
        active ? 'bg-brand-flow text-white' : TONE_CLASSNAME[tone]
      } ${className}`}
    >
      {label}
    </button>
  );
}
