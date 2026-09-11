'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, DateInput, FinancialValue, Input, Modal, SearchableSelect } from '@/shared/ui';

interface SimpleOption {
  id: string;
  name: string;
}

interface GenerateTransactionModalProps {
  beneficiaryId: string;
  beneficiaryName: string;
  type: 'INCOME' | 'EXPENSE';
  totalAmountCents: number;
  eligibleCount: number;
  periodFrom: string;
  periodTo: string;
  accounts: SimpleOption[];
  onClose: () => void;
}

/**
 * "Gerar transação" (Seções 36-40) — o único ponto de contato entre os
 * dois universos. SEMPRE consolida tudo que estiver elegível (pedido
 * explícito do cliente: nunca seleção manual/parcial) — o que este modal
 * mostra é só a confirmação e os dois dados que faltam pra criar a
 * transação de verdade: conta e data financeira.
 */
export function GenerateTransactionModal({
  beneficiaryId,
  beneficiaryName,
  type,
  totalAmountCents,
  eligibleCount,
  periodFrom,
  periodTo,
  accounts,
  onClose,
}: GenerateTransactionModalProps): React.ReactElement {
  const router = useRouter();
  const suggestedDescription = (type === 'INCOME' ? 'Repasse ' : 'Pagamento ') + beneficiaryName;
  const [description, setDescription] = useState(suggestedDescription);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(): Promise<void> {
    if (!accountId) {
      setError('Selecione a conta.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/programacoes/lancamentos/gerar-transacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          beneficiaryId,
          type,
          periodFrom,
          periodTo,
          transactionDate,
          accountId,
          description,
        }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) {
        setError(body.message ?? 'Não foi possível gerar a transação.');
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError('Não foi possível gerar a transação agora.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Gerar transação"
      footer={
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handleConfirm} loading={loading} className="flex-1">
            Confirmar e gerar
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-secondary">
          Vai consolidar {eligibleCount}{' '}
          {eligibleCount === 1 ? 'lançamento programado' : 'lançamentos programados'} de{' '}
          <strong className="text-ink-primary">{beneficiaryName}</strong> em uma única{' '}
          {type === 'INCOME' ? 'receita' : 'despesa'} no domínio financeiro oficial.
        </p>

        <FinancialValue cents={totalAmountCents} className="text-2xl" />

        <Input
          label="Descrição"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <SearchableSelect
          label="Conta"
          value={accountId}
          onChange={setAccountId}
          options={accounts.map((account) => ({ value: account.id, label: account.name }))}
          placeholder="Selecione a conta"
        />
        <DateInput
          label="Data da transação"
          value={transactionDate}
          onChange={(event) => setTransactionDate(event.target.value)}
          required
        />

        {error ? (
          <p role="alert" className="text-sm font-medium text-financial-danger">
            {error}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
