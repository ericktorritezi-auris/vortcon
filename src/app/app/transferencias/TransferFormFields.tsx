'use client';

import { DateInput, Input, MoneyInput, SearchableSelect } from '@/shared/ui';

interface SimpleOption {
  id: string;
  name: string;
}

export interface TransferFormValues {
  sourceAccountId: string | null;
  destinationAccountId: string | null;
  amountCents: number;
  scheduledDate: string;
  note: string;
}

interface TransferFormFieldsProps {
  values: TransferFormValues;
  onChange: (values: TransferFormValues) => void;
  accounts: SimpleOption[];
}

/** Campos compartilhados entre criação e edição de transferência (mesmo padrão de TransactionFormFields). */
export function TransferFormFields({
  values,
  onChange,
  accounts,
}: TransferFormFieldsProps): React.ReactElement {
  function set<K extends keyof TransferFormValues>(key: K, value: TransferFormValues[K]): void {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="flex flex-col gap-4">
      <MoneyInput
        label="Valor"
        valueInCents={values.amountCents}
        onValueChange={(cents) => set('amountCents', cents)}
      />
      <SearchableSelect
        label="De (conta de origem)"
        value={values.sourceAccountId}
        onChange={(value) => set('sourceAccountId', value)}
        options={accounts.map((account) => ({ value: account.id, label: account.name }))}
        placeholder="Selecione a conta de origem"
      />
      <SearchableSelect
        label="Para (conta de destino)"
        value={values.destinationAccountId}
        onChange={(value) => set('destinationAccountId', value)}
        options={accounts.map((account) => ({ value: account.id, label: account.name }))}
        placeholder="Selecione a conta de destino"
      />
      <DateInput
        label="Data"
        value={values.scheduledDate}
        onChange={(event) => set('scheduledDate', event.target.value)}
        required
      />
      <Input
        label="Observação"
        value={values.note}
        onChange={(event) => set('note', event.target.value)}
        hint="Opcional"
      />
    </div>
  );
}
