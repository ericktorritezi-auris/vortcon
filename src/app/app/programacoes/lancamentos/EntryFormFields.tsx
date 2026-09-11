'use client';

import { DateInput, Input, MoneyInput, SearchableSelect } from '@/shared/ui';

interface SimpleOption {
  id: string;
  name: string;
}

export interface EntryFormValues {
  originId: string | null;
  beneficiaryId: string | null;
  description: string;
  amountCents: number;
  entryDate: string;
}

interface EntryFormFieldsProps {
  values: EntryFormValues;
  onChange: (values: EntryFormValues) => void;
  origins: SimpleOption[];
  beneficiaries: SimpleOption[];
}

/**
 * Campos de um lançamento de Programação (Seção 15-16) — nunca conta,
 * categoria, tag, Pago/Recebido ou lembrete: esses conceitos pertencem
 * exclusivamente a Transações (Seção 16). Origem é opcional (Seção 15
 * não marca como obrigatória, diferente de Beneficiário).
 */
export function EntryFormFields({
  values,
  onChange,
  origins,
  beneficiaries,
}: EntryFormFieldsProps): React.ReactElement {
  function set<K extends keyof EntryFormValues>(key: K, value: EntryFormValues[K]): void {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="flex flex-col gap-4">
      <SearchableSelect
        label="Beneficiário"
        value={values.beneficiaryId}
        onChange={(value) => set('beneficiaryId', value)}
        options={beneficiaries.map((b) => ({ value: b.id, label: b.name }))}
        placeholder="Selecione o beneficiário"
        emptyMessage="Nenhum beneficiário ativo — cadastre um em Programações > Beneficiários."
      />
      <SearchableSelect
        label="Origem"
        value={values.originId}
        onChange={(value) => set('originId', value)}
        options={origins.map((o) => ({ value: o.id, label: o.name }))}
        placeholder="Selecione a origem (opcional)"
        emptyMessage="Nenhuma origem ativa — cadastre uma em Programações > Origens, se quiser usar."
      />
      <Input
        label="Descrição"
        value={values.description}
        onChange={(event) => set('description', event.target.value)}
        required
      />
      <MoneyInput
        label="Valor"
        valueInCents={values.amountCents}
        onValueChange={(cents) => set('amountCents', cents)}
      />
      <DateInput
        label="Data da programação"
        value={values.entryDate}
        onChange={(event) => set('entryDate', event.target.value)}
        required
      />
    </div>
  );
}
