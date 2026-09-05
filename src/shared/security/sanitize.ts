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

export function sanitizeLegalContent(rawHtml: string): string {
  return sanitizeHtml(rawHtml, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto'],
    disallowedTagsMode: 'discard',
  });
}
