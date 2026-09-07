/**
 * Proteção contra formula injection (Seção 101) — se um texto do usuário
 * (descrição, observação, nome de categoria/conta/tag) começa com um
 * caractere que o Excel/Sheets interpreta como início de fórmula (=, +, -,
 * @), prefixa com aspa simples para forçar leitura como texto literal. Sem
 * isso, uma descrição como "=cmd|'/c calc'!A1" executaria como fórmula ao
 * abrir a planilha.
 */
const FORMULA_TRIGGER_CHARS = ['=', '+', '-', '@', '\t', '\r'];

export function sanitizeExcelCell(value: string): string {
  if (value.length === 0) return value;
  const firstChar = value[0];
  if (firstChar && FORMULA_TRIGGER_CHARS.includes(firstChar)) {
    return `'${value}`;
  }
  return value;
}
