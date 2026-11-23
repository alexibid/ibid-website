const UNICODE_ESCAPE_PATTERN = /\\u[0-9a-fA-F]{4}|\\u\{[0-9a-fA-F]+\}/;
const LITERAL_ESCAPE_PATTERN = /\\["'nrt]/;
const ESCAPE_TOKEN_PATTERN =
  /\\(?:u([0-9a-fA-F]{4})|u\{([0-9a-fA-F]+)\}|r\\n|([nrt"'\\]))/g;

function hasOuterQuotes(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"');
}

function stripOuterQuotes(value: string): string {
  if (!hasOuterQuotes(value)) {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.slice(1, -1);
}

function decodeEscapeToken(
  _match: string,
  hexFour: string | undefined,
  hexBraced: string | undefined,
  simpleEscape: string | undefined,
): string {
  const hexValue = hexFour ?? hexBraced;
  if (hexValue !== undefined) {
    return String.fromCodePoint(Number.parseInt(hexValue, 16));
  }
  switch (simpleEscape) {
    case 'n':
    case 'r':
      return '\n';
    case 't':
      return '\t';
    case '"':
      return '"';
    case "'":
      return "'";
    case '\\':
      return '\\';
    default:
      return '\n';
  }
}

export function hasEncodingArtifacts(value: string): boolean {
  if (value.trim().length === 0) {
    return false;
  }
  if (hasOuterQuotes(value)) {
    return true;
  }
  return UNICODE_ESCAPE_PATTERN.test(value) || LITERAL_ESCAPE_PATTERN.test(value);
}

export function cleanEncodedHtml(raw: string): string {
  if (raw.trim().length === 0) {
    return raw;
  }
  let current = raw;
  for (let pass = 0; pass < 3; pass++) {
    const unquoted = stripOuterQuotes(current);
    const decoded = unquoted.replace(ESCAPE_TOKEN_PATTERN, decodeEscapeToken);
    if (decoded === current) {
      break;
    }
    current = decoded;
  }
  return current;
}

export function assertCleanUtf8Html(value: string, context: string): string {
  if (hasEncodingArtifacts(value)) {
    throw new Error(`Encoding artifact detected in ${context}`);
  }
  return value;
}
