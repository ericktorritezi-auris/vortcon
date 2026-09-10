'use client';

import { DateInput, Input, MoneyInput, SearchableSelect, TagPicker, Toggle } from '@/shared/ui';

interface SimpleOption {
  id: string;
  name: string;
}

export interface TransactionFormValues {
  description: string;
  amountCents: number;
  dueDate: string;
  accountId: string;
  categoryId: string;
  tagIds: string[];
  note: string;
  reminderEnabled: boolean;
  affectsBalance: boolean;
}

interface TransactionFormFieldsProps {
  values: TransactionFormValues;
  onChange: (values: TransactionFormValues) => void;
  accounts: SimpleOption[];
  categories: SimpleOption[];
  tags: SimpleOption[];
}

/**
 * Campos compartilhados entre criação e edição (Seção 56-57, 78) — mesmo
 * cadastro de categoria para despesa e receita (Seção 43), sem filtro por
 * natureza financeira aqui, de propósito.
 */
export function TransactionFormFields({
  values,
  onChange,
  accounts,
  categories,
  tags,
}: TransactionFormFieldsProps): React.ReactElement {
  function set<K extends keyof TransactionFormValues>(
    key: K,
    value: TransactionFormValues[K],
  ): void {
    onChange({ ...values, [key]: value });
  }

  return (
    <div className="flex flex-col gap-4">
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
        label="Vencimento"
        value={values.dueDate}
        onChange={(event) => set('dueDate', event.target.value)}
        required
      />
      <SearchableSelect
        label="Conta"
        value={values.accountId || null}
        onChange={(value) => set('accountId', value)}
        options={accounts.map((account) => ({ value: account.id, label: account.name }))}
        placeholder="Selecione uma conta"
      />
      <SearchableSelect
        label="Categoria"
        value={values.categoryId || null}
        onChange={(value) => set('categoryId', value)}
        options={categories.map((category) => ({ value: category.id, label: category.name }))}
        placeholder="Selecione uma categoria (opcional)"
      />
      <TagPicker
        label="Tags"
        availableTags={tags}
        selectedTagIds={values.tagIds}
        onChange={(tagIds) => set('tagIds', tagIds)}
      />
      <Input
        label="Observação"
        value={values.note}
        onChange={(event) => set('note', event.target.value)}
        hint="Opcional"
      />
      <Toggle
        label="Lembrete"
        checked={values.reminderEnabled}
        onChange={(checked) => set('reminderEnabled', checked)}
      />
      <Toggle
        label="Influencia no saldo das contas"
        checked={values.affectsBalance}
        onChange={(checked) => set('affectsBalance', checked)}
      />
      {!values.affectsBalance ? (
        <p className="-mt-2 text-xs text-ink-secondary">
          Fica registrada só como histórico — não muda o saldo real de nenhuma conta.
        </p>
      ) : null}
    </div>
  );
}
