import {
  assertCleanUtf8Html,
  cleanEncodedHtml,
  hasEncodingArtifacts,
} from './content-encoding.util';
import { ENCODING_FIXTURES } from '../mocks/portfolio-content.mock';

describe('content-encoding.util', () => {
  it('should decode escaped Unicode sequences, literal escaped quotes, literal newline escapes, and outer quotes into clean UTF-8 HTML', () => {
    const cleaned = cleanEncodedHtml(ENCODING_FIXTURES.dirtyUnicodeAndQuotesHtml);

    expect(cleaned).toContain('Estratégia');
    expect(cleaned).toContain('"Design"');
    expect(cleaned).toContain('Conteúdos');
    expect(cleaned).toContain('parágrafo');
    expect(cleaned).toContain('— Solum');
    expect(cleaned.startsWith('"')).toBe(false);
    expect(cleaned.endsWith('"')).toBe(false);
    expect(cleaned.includes('\\u')).toBe(false);
    expect(cleaned.includes('\\"')).toBe(false);
    expect(cleaned.includes('\\n')).toBe(false);
    expect(hasEncodingArtifacts(cleaned)).toBe(false);
  });

  it('should decode HTML img attributes with literal escaped quotes into valid clean UTF-8 HTML', () => {
    const cleaned = cleanEncodedHtml(ENCODING_FIXTURES.dirtyImageHtml);

    expect(cleaned).toBe(
      '<p>Texto</p><img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200" alt="Web design">',
    );
    expect(hasEncodingArtifacts(cleaned)).toBe(false);
  });

  it('should preserve clean UTF-8 HTML unchanged and remain idempotent across repeated calls', () => {
    const once = cleanEncodedHtml(ENCODING_FIXTURES.cleanUtf8Html);
    const twice = cleanEncodedHtml(once);

    expect(once).toBe(ENCODING_FIXTURES.cleanUtf8Html);
    expect(twice).toBe(once);
    expect(cleanEncodedHtml(ENCODING_FIXTURES.cleanMultilineUtf8Html)).toBe(
      ENCODING_FIXTURES.cleanMultilineUtf8Html,
    );
    expect(hasEncodingArtifacts(ENCODING_FIXTURES.cleanMultilineUtf8Html)).toBe(false);
  });

  it('should handle empty, whitespace-only, and single-character boundary inputs without throwing', () => {
    expect(cleanEncodedHtml(ENCODING_FIXTURES.emptyValue)).toBe(ENCODING_FIXTURES.emptyValue);
    expect(cleanEncodedHtml(ENCODING_FIXTURES.whitespaceValue)).toBe(
      ENCODING_FIXTURES.whitespaceValue,
    );
    expect(cleanEncodedHtml(ENCODING_FIXTURES.singleCharValue)).toBe(
      ENCODING_FIXTURES.singleCharValue,
    );
    expect(hasEncodingArtifacts(ENCODING_FIXTURES.emptyValue)).toBe(false);
    expect(hasEncodingArtifacts(ENCODING_FIXTURES.singleCharValue)).toBe(false);
  });

  it('should detect escaped Unicode, literal escaped quotes, literal newline escapes, and outer quotes via hasEncodingArtifacts', () => {
    for (const sample of ENCODING_FIXTURES.dirtyArtifacts) {
      expect(hasEncodingArtifacts(sample.value)).toBe(true);
    }
    expect(hasEncodingArtifacts(ENCODING_FIXTURES.cleanUtf8Html)).toBe(false);
  });

  it('should return clean UTF-8 HTML from assertCleanUtf8Html and throw with context when encoding artifacts exist', () => {
    expect(assertCleanUtf8Html(ENCODING_FIXTURES.cleanUtf8Html, 'pt:home:front-cover')).toBe(
      ENCODING_FIXTURES.cleanUtf8Html,
    );

    for (const sample of ENCODING_FIXTURES.dirtyArtifacts) {
      expect(() => assertCleanUtf8Html(sample.value, sample.context)).toThrow(sample.context);
    }
  });
});
