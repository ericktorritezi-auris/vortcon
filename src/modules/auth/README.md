# Módulo: auth

Autenticação: login, sessões, convites, definição/recuperação de senha, AccessPolicyService (Seções 18, 25-29, 713).

## Implementado (Estágio 4)

- `login.service.ts` — autenticação por usuário/senha.
- `session.repository.ts` / `session.service.ts` — sessão server-side via cookie
  (`HttpOnly`, `Secure` em produção, `SameSite=Lax`). `session.constants.ts` isola o
  nome do cookie sem dependências, para ser seguro em Edge Runtime (middleware).
- `invitation.service.ts` — convite de ativação (Seção 25), uso único, 48h.
- `password-reset.service.ts` — recuperação de senha (Seção 27), uso único, 1h,
  resposta anti-enumeração.
- `access-policy.service.ts` — o gate central (Seção 29), com todos os estados. O
  aceite legal é um stub (`hasAcceptedRequiredLegalDocuments`) até o Estágio 5.

Rotas em `src/app/api/auth/*` e páginas em `src/app/entrar`, `/convite/[token]`,
`/esqueci-senha`, `/redefinir-senha/[token]`.
