import { expect } from 'vitest';

interface CssRule { readonly media: string; readonly selectors: readonly string[]; readonly body: string; }
type CssRuleTuple = readonly [selector: RegExp, declaration: RegExp, media?: RegExp];
function normalizeSelectorPart(rawSelector: string): string {
  return rawSelector.replace(/\[_nghost-[^\]]+\]/g, ':host').replace(/\[_ngcontent-[^\]]+\]/g, '').replace(/\s+/g, ' ').trim();
}

function parseCssRules(cssText: string, media = ''): CssRule[] {
  const cleaned = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules: CssRule[] = [];
  for (let index = 0; index < cleaned.length; ) {
    const openIndex = cleaned.indexOf('{', index);
    if (openIndex === -1) break;
    const header = cleaned.slice(index, openIndex).replace(/\s+/g, ' ').trim();
    let [depth, cursor] = [1, openIndex + 1];
    while (cursor < cleaned.length && depth > 0) {
      if (cleaned[cursor] === '{') depth++;
      else if (cleaned[cursor] === '}') depth--;
      cursor++;
    }
    const body = cleaned.slice(openIndex + 1, cursor - 1).trim();
    if (header.startsWith('@media')) rules.push(...parseCssRules(body, header.replace(/^@media\s*/, '')));
    else if (!header.startsWith('@')) {
      rules.push({ media, selectors: header.split(',').map(normalizeSelectorPart), body: body.replace(/\s+/g, ' ') });
    }
    index = cursor;
  }
  return rules;
}

export function expectCssRules(root: HTMLElement, expected: readonly CssRuleTuple[]): void {
  const hostAttr = Array.from(root.attributes).find(attr => attr.name.startsWith('_nghost-'))?.name ?? '';
  const styleTexts = Array.from(document.head.querySelectorAll('style')).map(style => style.textContent ?? '');
  const rules = parseCssRules(styleTexts.filter(text => (hostAttr && text.includes(hostAttr)) || text.includes('.contact-form')).join('\n'));
  for (const [selector, declaration, media] of expected) {
    const matched = rules.some(rule => (!media || media.test(rule.media)) && rule.selectors.some(part => selector.test(part)) && declaration.test(rule.body));
    expect(matched, `Expected CSS rule matching ${selector} -> ${declaration}${media ? ` in ${media}` : ''}`).toBe(true);
  }
}
