import { describe, expect, it } from 'vitest';
import { sanitizeLegalContent } from '@/shared/security/sanitize';

describe('sanitização de conteúdo legal (Seção 130)', () => {
  it('remove tags de script por completo', () => {
    const result = sanitizeLegalContent('<script>alert("xss")</script><p>Texto legítimo</p>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
    expect(result).toContain('Texto legítimo');
  });

  it('remove atributos de evento inline (onclick, onerror etc.)', () => {
    const result = sanitizeLegalContent(
      '<p onclick="evil()">Texto</p><img src="x" onerror="evil()">',
    );
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onerror');
    expect(result).not.toContain('<img');
  });

  it('preserva as tags permitidas pela especificação (Seção 130)', () => {
    const html =
      '<h2>Título</h2><h3>Subtítulo</h3><p>Parágrafo com <strong>negrito</strong> e <em>itálico</em>.</p>' +
      '<ul><li>Item</li></ul><a href="https://vortcon.belleplanner.com.br">link</a><hr>';
    const result = sanitizeLegalContent(html);

    expect(result).toContain('<h2>Título</h2>');
    expect(result).toContain('<strong>negrito</strong>');
    expect(result).toContain('<em>itálico</em>');
    expect(result).toContain('<ul>');
    expect(result).toContain('href="https://vortcon.belleplanner.com.br"');
    expect(result).toContain('<hr');
  });

  it('bloqueia esquemas de link perigosos (javascript:)', () => {
    const result = sanitizeLegalContent('<a href="javascript:alert(1)">clique</a>');
    expect(result).not.toContain('javascript:');
  });

  it('descarta tags fora da lista permitida (ex.: iframe, table)', () => {
    const result = sanitizeLegalContent(
      '<iframe src="https://evil.com"></iframe><table><tr><td>x</td></tr></table>',
    );
    expect(result).not.toContain('<iframe');
    expect(result).not.toContain('<table');
  });
});
