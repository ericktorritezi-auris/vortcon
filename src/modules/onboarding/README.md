# Módulo: onboarding

Tour e checklist de Primeiros Passos (Seção 84-85).

## Implementado (Estágio 10)

`onboarding.service.ts` — os 4 passos (conta, categoria, primeira despesa, primeira
receita) são sempre **derivados dos dados reais** do tenant, nunca armazenados como
flags separadas (evita uma segunda fonte de verdade dessincronizando, ex.: usuário cria
e depois apaga a única conta). Só o estado de dispensa é persistido
(`OnboardingProgress`, Seção 38 já previa esta entidade): Tour pode ser pulado, e o
checklist só aceita confirmação quando os 4 passos já estão de fato completos —
"depois desaparece permanentemente" (Seção 85).

Excluída pelo Factory Reset (Estágio 19) junto com o resto do tenant — é dado de teste.
