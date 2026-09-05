# Módulo: audit

Auditoria de eventos do sistema com privacidade de logs (Seções 146-147).

## Implementado (Estágio 6)

`audit.service.ts` — `recordAuditEvent`, com `metadataSanitized` nunca contendo valor,
descrição, categoria, tag, nota ou saldo (Seção 147). Conectado a: provisionamento de
tenant, bloqueio automático por inadimplência, bloqueio/desbloqueio manual pelo Admin,
pagamento de mensalidade.
