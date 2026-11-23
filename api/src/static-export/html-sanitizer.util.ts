interface ParsedAttribute {
  readonly name: string;
  readonly value: string;
  readonly hasValue: boolean;
}

interface ParsedOpenTag {
  readonly tagName: string;
  readonly isSelfClosing: boolean;
  readonly attributes: readonly ParsedAttribute[];
}

interface SanitizerState {
  readonly html: string;
  readonly stripStack: string[];
  readonly output: string[];
}

const STRIP_WITH_CONTENT_TAGS = new Set([
  'script', 'style', 'iframe', 'svg', 'object', 'embed', 'math',
  'noscript', 'template', 'form', 'applet', 'frame', 'frameset',
]);

const ALLOWED_TAGS = new Set([
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'sub', 'sup', 'small', 'mark',
  'blockquote', 'pre', 'code', 'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'div', 'span', 'figure', 'figcaption', 'img', 'a',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
  'section', 'article', 'header', 'footer', 'aside', 'details', 'summary',
]);

const GLOBAL_ALLOWED_ATTRS = new Set(['class', 'id', 'title', 'dir', 'lang', 'role']);

const TAG_ALLOWED_ATTRS: Readonly<Record<string, ReadonlySet<string>>> = {
  a: new Set(['href', 'target', 'rel']),
  img: new Set(['src', 'alt', 'width', 'height', 'loading', 'decoding']),
  ol: new Set(['start', 'reversed', 'type']),
  td: new Set(['colspan', 'rowspan', 'scope', 'headers']),
  th: new Set(['colspan', 'rowspan', 'scope', 'headers']),
  col: new Set(['span']),
  colgroup: new Set(['span']),
};

export function sanitizePageHtml(rawHtml: string): string {
  if (rawHtml.trim().length === 0) return '';
  const state: SanitizerState = { html: rawHtml, stripStack: [], output: [] };
  let cursor = 0;

  while (cursor < rawHtml.length) {
    const ltIndex = rawHtml.indexOf('<', cursor);
    if (ltIndex === -1) {
      if (state.stripStack.length === 0) state.output.push(rawHtml.slice(cursor));
      break;
    }
    if (ltIndex > cursor && state.stripStack.length === 0) {
      state.output.push(rawHtml.slice(cursor, ltIndex));
    }
    if (rawHtml.startsWith('<!--', ltIndex)) {
      const commentEnd = rawHtml.indexOf('-->', ltIndex + 4);
      cursor = commentEnd === -1 ? rawHtml.length : commentEnd + 3;
      continue;
    }
    const nextChar = rawHtml[ltIndex + 1] ?? '';
    if (nextChar === '/') {
      cursor = handleClosingTag(state, ltIndex);
    } else if (nextChar === '!' || nextChar === '?') {
      const declEnd = findTagEnd(rawHtml, ltIndex);
      cursor = declEnd === -1 ? rawHtml.length : declEnd + 1;
    } else if (!/[a-zA-Z]/.test(nextChar)) {
      if (state.stripStack.length === 0) state.output.push('<');
      cursor = ltIndex + 1;
    } else {
      cursor = handleOpeningTag(state, ltIndex);
    }
  }
  return state.output.join('');
}

function handleClosingTag(state: SanitizerState, ltIndex: number): number {
  const tagEnd = findTagEnd(state.html, ltIndex);
  if (tagEnd === -1) return state.html.length;
  const inner = state.html.slice(ltIndex + 2, tagEnd).trim();
  const tagName = (/^([a-zA-Z][a-zA-Z0-9-]*)/.exec(inner)?.[1] ?? '').toLowerCase();

  if (state.stripStack.length > 0) {
    if (tagName && state.stripStack[state.stripStack.length - 1] === tagName) {
      state.stripStack.pop();
    }
    return tagEnd + 1;
  }
  if (tagName && ALLOWED_TAGS.has(tagName)) {
    state.output.push(`</${tagName}>`);
  }
  return tagEnd + 1;
}

function handleOpeningTag(state: SanitizerState, ltIndex: number): number {
  const tagEnd = findTagEnd(state.html, ltIndex);
  if (tagEnd === -1) {
    if (state.stripStack.length === 0) state.output.push(state.html.slice(ltIndex));
    return state.html.length;
  }
  const rawSlice = state.html.slice(ltIndex, tagEnd + 1);
  const parsed = parseOpenTag(state.html.slice(ltIndex + 1, tagEnd));
  if (!parsed) {
    if (state.stripStack.length === 0) state.output.push(rawSlice);
    return tagEnd + 1;
  }
  if (STRIP_WITH_CONTENT_TAGS.has(parsed.tagName)) {
    const matchesTop =
      state.stripStack.length === 0 ||
      state.stripStack[state.stripStack.length - 1] === parsed.tagName;
    if (!parsed.isSelfClosing && matchesTop) state.stripStack.push(parsed.tagName);
    return tagEnd + 1;
  }
  if (state.stripStack.length === 0 && ALLOWED_TAGS.has(parsed.tagName)) {
    state.output.push(formatSanitizedOpenTag(parsed, rawSlice));
  }
  return tagEnd + 1;
}

function findTagEnd(html: string, startIndex: number): number {
  let quote: string | null = null;
  for (let i = startIndex + 1; i < html.length; i++) {
    const ch = html[i];
    if (quote !== null) {
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return i;
    }
  }
  return -1;
}

function parseOpenTag(inner: string): ParsedOpenTag | undefined {
  const nameMatch = /^([a-zA-Z][a-zA-Z0-9-]*)/.exec(inner);
  if (!nameMatch) return undefined;
  const tagName = nameMatch[1].toLowerCase();
  const restRaw = inner.slice(nameMatch[1].length);
  const trimmedEnd = restRaw.trimEnd();
  const isSelfClosing = trimmedEnd.endsWith('/');
  const attrSource = isSelfClosing ? trimmedEnd.slice(0, -1) : restRaw;
  return { tagName, isSelfClosing, attributes: parseAttributes(attrSource) };
}

function parseAttributes(source: string): ParsedAttribute[] {
  const attributes: ParsedAttribute[] = [];
  let i = 0;

  while (i < source.length) {
    while (i < source.length && /\s/.test(source[i])) i += 1;
    if (i >= source.length) break;
    const nameStart = i;
    while (i < source.length && !/[\s=/]/.test(source[i])) i += 1;
    const name = source.slice(nameStart, i);
    if (!name) {
      i += 1;
      continue;
    }
    while (i < source.length && /\s/.test(source[i])) i += 1;
    if (source[i] !== '=') {
      attributes.push({ name, value: '', hasValue: false });
      continue;
    }
    i += 1;
    while (i < source.length && /\s/.test(source[i])) i += 1;
    const quote = source[i];
    if (quote === '"' || quote === "'") {
      i += 1;
      const valStart = i;
      while (i < source.length && source[i] !== quote) i += 1;
      attributes.push({ name, value: source.slice(valStart, i), hasValue: true });
      if (i < source.length) i += 1;
    } else {
      const valStart = i;
      while (i < source.length && !/\s/.test(source[i])) i += 1;
      attributes.push({ name, value: source.slice(valStart, i), hasValue: true });
    }
  }
  return attributes;
}

function formatSanitizedOpenTag(parsed: ParsedOpenTag, rawSlice: string): string {
  const safeAttrs: ParsedAttribute[] = [];
  let strippedAny = false;

  for (const attr of parsed.attributes) {
    if (isAllowedAttribute(parsed.tagName, attr)) {
      safeAttrs.push(attr);
    } else {
      strippedAny = true;
    }
  }
  if (!strippedAny) return rawSlice;

  const attrText = safeAttrs
    .map((attr) =>
      attr.hasValue
        ? ` ${attr.name.toLowerCase()}="${attr.value.replace(/"/g, '&quot;')}"`
        : ` ${attr.name.toLowerCase()}`,
    )
    .join('');
  return `<${parsed.tagName}${attrText}${parsed.isSelfClosing ? ' />' : '>'}`;
}

function isAllowedAttribute(tagName: string, attr: ParsedAttribute): boolean {
  const lowerName = attr.name.toLowerCase();
  if (lowerName.startsWith('on') || lowerName === 'style' || lowerName === 'srcdoc') {
    return false;
  }
  const tagSpecific = TAG_ALLOWED_ATTRS[tagName];
  const isPermittedName =
    GLOBAL_ALLOWED_ATTRS.has(lowerName) ||
    lowerName.startsWith('aria-') ||
    lowerName.startsWith('data-') ||
    (tagSpecific !== undefined && tagSpecific.has(lowerName));
  if (!isPermittedName) return false;
  return lowerName === 'href' || lowerName === 'src' ? isSafeUrl(attr.value) : true;
}

function isSafeUrl(rawValue: string): boolean {
  const normalized = stripControlAndSpace(decodeBasicEntities(rawValue));
  if (normalized.length === 0 || normalized.startsWith('//')) return false;
  if (normalized.startsWith('#') || normalized.startsWith('/')) return true;
  const delimiterIndex = normalized.search(/[:/?#]/);
  if (delimiterIndex === -1 || normalized[delimiterIndex] !== ':') return true;
  const scheme = normalized.slice(0, delimiterIndex).toLowerCase();
  return scheme === 'http' || scheme === 'https';
}

function stripControlAndSpace(value: string): string {
  let result = '';
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code > 0x20 && code !== 0x7f) result += value[i];
  }
  return result;
}

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&#(\d+);?/g, (_, dec: string) => toSafeCodePoint(Number.parseInt(dec, 10)))
    .replace(/&#[xX]([0-9a-fA-F]+);?/g, (_, hex: string) =>
      toSafeCodePoint(Number.parseInt(hex, 16)),
    )
    .replace(/&colon;/gi, ':')
    .replace(/&tab;/gi, '\t')
    .replace(/&newline;/gi, '\n');
}

function toSafeCodePoint(code: number): string {
  return Number.isInteger(code) && code > 0 && code <= 0x10ffff
    ? String.fromCodePoint(code)
    : '';
}
