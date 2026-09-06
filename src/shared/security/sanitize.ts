import sanitizeHtml from 'sanitize-html';

/**
 * Sanitização de rich text de documentos legais (Seção 130). Permite só a
 * formatação básica listada na especificação — títulos, subtítulos,
 * parágrafos, negrito, itálico, listas, links, divisores. Nunca JavaScript
 * ou HTML arbitrário, mesmo vindo de um Admin autenticado: sanitizar sempre
 * no servidor, nunca confiar em sanitização feita só no client.
 */
const ALLOWED_TAGS = ['h2', 'h3', 'p', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'a', 'hr', 'br'];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  a: ['href', 'title'],
};

// Tags que já são blocos por si só — um trecho que já começa com uma delas
// não deve ser envolvido em <p> de novo (evita <p><h2>...</h2></p>, que o
// sanitize-html teria que desfazer de qualquer jeito).
const BLOCK_TAG_PATTERN = /^\s*<(h2|h3|ul|ol|hr)\b/i;

/**
 * Converte quebras de linha "soltas" em parágrafos HTML de verdade.
 *
 * O editor (Seção 130) é um textarea simples: o Admin digita texto corrido
 * e só usa a toolbar para negrito/título/lista quando quer. Sem esta
 * conversão, uma linha em branco entre parágrafos (o jeito natural de
 * separar parágrafos ao digitar) não produzia HTML nenhum — e como HTML
 * ignora quebra de linha simples ao renderizar, tudo colapsava visualmente
 * num bloco só. Regra: uma ou mais linhas em branco = novo parágrafo;
 * quebra de linha simples dentro do mesmo parágrafo = `<br>`.
 */
function convertPlainBreaksToParagraphs(rawHtml: string): string {
  return rawHtml
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((block) =>
      BLOCK_TAG_PATTERN.test(block) ? block : `<p>${block.replace(/\n/g, '<br>')}</p>`,
    )
    .join('\n');
}

export function sanitizeLegalContent(rawHtml: string): string {
  return sanitizeHtml(convertPlainBreaksToParagraphs(rawHtml), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
  });
}
