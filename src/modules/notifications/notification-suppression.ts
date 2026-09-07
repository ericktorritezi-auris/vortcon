export interface SuppressibleTransaction {
  status: 'PENDING' | 'PAID' | 'RECEIVED' | 'CANCELLED';
  ignored: boolean;
}

/**
 * Supressão de lembrete (Seção 118): nunca notificar se a transação já
 * está paga, recebida, cancelada ou marcada como ignorada — mesmo que o
 * job de lembretes rode depois dessas mudanças. Pura, sem I/O, para poder
 * ser checada tanto antes de enviar quanto em testes isolados.
 */
export function shouldSuppressReminder(transaction: SuppressibleTransaction): boolean {
  if (transaction.ignored) return true;
  return (
    transaction.status === 'PAID' ||
    transaction.status === 'RECEIVED' ||
    transaction.status === 'CANCELLED'
  );
}
