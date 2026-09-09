'use client';

import { DateInput, Input, Select, Toggle } from '@/shared/ui';

export interface RecurrenceValues {
  enabled: boolean;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
  interval: number;
  endDate: string;
  maxOccurrences: string;
}

export const EMPTY_RECURRENCE: RecurrenceValues = {
  enabled: false,
  frequency: 'MONTHLY',
  interval: 1,
  endDate: '',
  maxOccurrences: '',
};

const FREQUENCY_OPTIONS = [
  { value: 'DAILY', label: 'Diária' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'YEARLY', label: 'Anual' },
];

interface RecurrenceFieldsProps {
  values: RecurrenceValues;
  onChange: (values: RecurrenceValues) => void;
  toggleLabel: string;
}

/**
 * Campos de recorrência (Estágio 16C — lacuna corrigida: essa UI nunca
 * existiu antes, mesmo o backend já pronto desde o Estágio 8).
 * Compartilhado entre o formulário de transação e o de transferência —
 * a definição de frequência/intervalo/término é idêntica nos dois.
 */
export function RecurrenceFields({
  values,
  onChange,
  toggleLabel,
}: RecurrenceFieldsProps): React.ReactElement {
  function set<K extends keyof RecurrenceValues>(key: K, value: RecurrenceValues[K]): void {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="flex flex-col gap-3">
      <Toggle
        label={toggleLabel}
        checked={values.enabled}
        onChange={(checked) => set('enabled', checked)}
      />

      {values.enabled ? (
        <div className="flex flex-col gap-3 rounded-md border border-ink-secondary/15 bg-surface-page p-3">
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Frequência"
              value={values.frequency}
              onChange={(event) =>
                set('frequency', event.target.value as RecurrenceValues['frequency'])
              }
              options={FREQUENCY_OPTIONS}
            />
            <Input
              label="Repetir a cada"
              type="number"
              min={1}
              value={values.interval}
              onChange={(event) => set('interval', Number(event.target.value) || 1)}
              hint={
                values.frequency === 'MONTHLY'
                  ? 'meses'
                  : values.frequency === 'WEEKLY'
                    ? 'semanas'
                    : undefined
              }
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DateInput
              label="Termina em"
              value={values.endDate}
              onChange={(event) => set('endDate', event.target.value)}
            />
            <Input
              label="Ou após quantas vezes"
              type="number"
              min={1}
              value={values.maxOccurrences}
              onChange={(event) => set('maxOccurrences', event.target.value)}
              hint="Opcional"
            />
          </div>
          <p className="text-xs text-ink-secondary">
            Se você não preencher nenhum dos dois, a recorrência continua até você encerrar
            manualmente.
          </p>
        </div>
      ) : null}
    </div>
  );
}
