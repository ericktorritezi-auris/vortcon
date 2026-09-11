import type { FinancialTransactionType, Prisma } from '@prisma/client';
import { prisma } from '@/shared/database/client';
import { createIncomeOrExpense } from '@/modules/transactions/transaction.service';

export interface GenerateTransactionInput {
  beneficiaryId: string;
  type: FinancialTransactionType;
  periodFrom: Date;
  periodTo: Date;
  transactionDate: Date;
  accountId: string;
  /** Seção 36: "descrição sugerida" — o padrão é sugerido, editável antes de confirmar. */
  description?: string;
}

export interface GenerateTransactionResult {
  transactionId: string;
  totalAmountCents: number;
  consolidatedEntryCount: number;
}

/**
 * "Gerar transação" (Seções 35-43) — o ÚNICO ponto de contato entre os
 * dois universos. Sempre consolida TUDO que estiver elegível pro mesmo
 * beneficiário+tipo no período (pedido explícito do cliente: "ele vai
 * fechar tudo, não vou escolher manualmente" — nunca seleção parcial).
 *
 * Seção 35: receita e despesa NUNCA se compensam — esta função só olha
 * UM tipo por vez; o beneficiário com os dois lados gera duas transações
 * separadas, cada uma com sua própria chamada.
 *
 * Idempotência (Seção 43): tudo dentro de uma única transação de banco.
 * O UPDATE final tem `convertedAt: null` na condição — se outra chamada
 * concorrente já converteu alguma dessas entradas entre a leitura e a
 * escrita (corrida real, ex.: clique duplo), o count de linhas afetadas
 * fica menor que o esperado, e a função lança erro, desfazendo TUDO
 * (inclusive a transação financeira recém-criada) — nunca fica uma
 * transação orfã sem lançamento de Programação vinculado.
 */
export async function generateTransactionFromEntries(
  tenantId: string,
  input: GenerateTransactionInput,
): Promise<GenerateTransactionResult> {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const beneficiary = await tx.programmingBeneficiary.findFirst({
      where: { id: input.beneficiaryId, tenantId },
    });
    if (!beneficiary) throw new Error('Beneficiário não encontrado neste tenant.');

    const eligibleEntries = await tx.programmingEntry.findMany({
      where: {
        tenantId,
        beneficiaryId: input.beneficiaryId,
        type: input.type,
        status: 'ACTIVE',
        convertedAt: null,
        entryDate: { gte: input.periodFrom, lte: input.periodTo },
      },
    });

    if (eligibleEntries.length === 0) {
      throw new Error('Não há lançamentos elegíveis para gerar transação neste período.');
    }

    const totalAmountCents = eligibleEntries.reduce(
      (sum: number, entry: { amountCents: number }) => sum + entry.amountCents,
      0,
    );

    const descriptionPrefix = input.type === 'INCOME' ? 'Repasse' : 'Pagamento';
    const description = input.description?.trim() || `${descriptionPrefix} ${beneficiary.name}`;

    // Seção 40: nunca duplicar o Financial Engine — sempre pelo serviço
    // oficial de Transações. Passa `tx` explicitamente — sem isso, a
    // criação da transação rodaria FORA desta transação de banco, e o
    // rollback abaixo (corrida detectada) nunca desfaria a transação
    // financeira já criada, deixando uma transação órfã sem lançamento
    // de Programação vinculado.
    const transaction = await createIncomeOrExpense(
      tenantId,
      {
        type: input.type,
        description,
        amountCents: totalAmountCents,
        dueDate: input.transactionDate,
        accountId: input.accountId,
      },
      tx,
    );

    const now = new Date();
    const updateResult = await tx.programmingEntry.updateMany({
      where: {
        id: { in: eligibleEntries.map((e: { id: string }) => e.id) },
        convertedAt: null,
      },
      data: { generatedTransactionId: transaction.id, convertedAt: now },
    });

    if (updateResult.count !== eligibleEntries.length) {
      // Corrida real detectada (Seção 43) — desfaz tudo, inclusive a
      // transação que acabamos de criar, lançando erro pra fora da
      // transação de banco (o rollback do Postgres cuida do resto).
      throw new Error(
        'Alguns lançamentos foram convertidos por outra ação simultânea — tente novamente.',
      );
    }

    return {
      transactionId: transaction.id,
      totalAmountCents,
      consolidatedEntryCount: eligibleEntries.length,
    };
  });
}
