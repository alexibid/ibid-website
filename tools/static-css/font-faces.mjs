function declarationValue(text, property) {
  const match = new RegExp(`${property}\\s*:\\s*([^;}]+)`).exec(text);
  return match ? match[1].trim() : '';
}

function parseRange(token) {
  const [start, end] = token.replace(/^u\+/i, '').split('-');
  if (start.includes('?')) {
    return [parseInt(start.replace(/\?/g, '0'), 16), parseInt(start.replace(/\?/g, 'f'), 16)];
  }
  return [parseInt(start, 16), parseInt(end ?? start, 16)];
}

function rangesOf(text) {
  const value = declarationValue(text, 'unicode-range');
  return value ? value.split(',').map((token) => parseRange(token.trim())) : [[0, 0x10ffff]];
}

function codePointsOf(text) {
  return new Set(Array.from(text.replace(/\s+/g, ' '), (character) => character.codePointAt(0)));
}

export function fontFaceIsUsed(fontFaceText, usage) {
  const family = declarationValue(fontFaceText, 'font-family').replace(/['"]/g, '');
  if (!usage.families.has(family)) return false;
  const ranges = rangesOf(fontFaceText);
  return Array.from(usage.codePoints).some((point) => ranges.some(([start, end]) => point >= start && point <= end));
}

export function fontUsageOf(results) {
  return {
    families: new Set(results.flatMap((result) => result.families)),
    codePoints: codePointsOf(results.map((result) => result.text).join(' '))
  };
}
