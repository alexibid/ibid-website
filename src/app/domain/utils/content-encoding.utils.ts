const MAX_DECODE_LEVELS = 3;
const JSON_STRING_DELIMITER = '"';
const HTML_TAG_START = '<';

function isQuotedText(text: string): boolean {
  return (
    text.length >= 2 &&
    text.startsWith(JSON_STRING_DELIMITER) &&
    text.endsWith(JSON_STRING_DELIMITER)
  );
}

function isHtmlString(value: unknown): value is string {
  return typeof value === 'string' && value.trimStart().startsWith(HTML_TAG_START);
}

function unwrapOneLevel(stored: string): string {
  const decoded: unknown = JSON.parse(stored.trim());
  if (!isHtmlString(decoded)) {
    throw new Error('Stored content is not an encoded HTML string');
  }
  return decoded;
}

export function isEncodedContent(stored: string): boolean {
  if (!isQuotedText(stored.trim())) {
    return false;
  }
  try {
    unwrapOneLevel(stored);
    return true;
  } catch {
    return false;
  }
}

export function decodeStoredContent(stored: string): string {
  let decoded = stored;
  for (let level = 0; level < MAX_DECODE_LEVELS && isEncodedContent(decoded); level++) {
    decoded = unwrapOneLevel(decoded);
  }
  return decoded;
}
