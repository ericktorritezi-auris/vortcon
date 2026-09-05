# Shared: design-system

Tokens e primitivos visuais da marca VortCon (Master Document, Seções 6-11).

## Implementados (Estágio 2)

- `Logo.tsx` — `<VortConMark />`, o símbolo oficial reconstruído a partir da identidade
  fornecida, validado visualmente. Funciona em qualquer tamanho, colorido ou
  monocromático (`variant="currentColor"`).
- `icons.ts` — catálogo controlado de `icon_key` → ícone (lucide-react). Categorias e
  navegação só usam chaves deste catálogo — nunca SVG arbitrário (Seção 13).
- Tokens de cor/raio/espaçamento: `tailwind.config.ts` (raiz do projeto) e
  `src/app/globals.css` (mesmos valores como CSS variables `--vc-*`).

Biblioteca de ícones escolhida: **lucide-react** — única biblioteca SVG consistente
usada em todo o app (Seção 13), sem emojis como sistema visual.
