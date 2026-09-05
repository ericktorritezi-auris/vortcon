# Módulo: subscriptions

Assinatura do tenant, mensalidades, PIX, inadimplência automatizada (Seções 106-114).

## Implementado (Estágio 6)

- `subscription.repository.ts` / `subscription.service.ts`.
- `ensureCurrentMonthCharge` — gera a mensalidade do mês vigente de forma idempotente.
  Isento (Seção 108) nunca gera cobrança.
- `evaluateAndApplyDelinquency` — bloqueio automático por inadimplência (Seção 113:
  carência de 5 dias após o vencimento).
- `registerPayment` — só o Admin registra pagamento (Seção 110); desbloqueia
  automaticamente um bloqueio DELINQUENCY (Seção 114), nunca ADMINISTRATIVE/SECURITY.

Ambas as funções reativas (`ensure`/`evaluate`) são chamadas pelo `AccessPolicyService`
a cada avaliação de acesso — substituto temporário de job agendado até o Estágio 13.
