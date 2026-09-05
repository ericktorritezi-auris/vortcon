# Módulo: legal

Documentos legais versionados, aceites e gate de acesso (Seções 129-137).

## Implementado (Estágio 5)

- `legal-document.repository.ts` / `legal-document.service.ts` — CRUD de rascunho
  (`saveDraft`) e publicação (`publishDraft`), com versionamento imutável (Seção 131):
  publicar arquiva a versão anterior, nunca edita uma versão já publicada.
- `legal-acceptance.service.ts` — registro de aceite com evidência (IP, user agent —
  Seção 133, nunca um booleano solto) e `findPendingAcceptances`/
  `hasAcceptedAllRequiredDocuments`, consumidos pelo `AccessPolicyService` (Estágio 4)
  para o gate real (Seção 135).
- Sanitização de rich text em `src/shared/security/sanitize.ts` (Seção 130).

Páginas públicas em `src/app/privacidade`, `/termos` (Seção 136). Gate em
`src/app/aceitar-termos` (Seção 135). Admin em `src/app/admin/legal` (Seção 129, 137) —
editor simplificado por toolbar, sem biblioteca WYSIWYG pesada.
