import { describe, expect, it } from 'vitest';
import { InvalidPocketbaseRecordError, countByTypeAndLang, rewriteMediaUrls, toPageInput } from './pocketbase-mapping.js';
import { MOCK_BROKEN_RECORDS, MOCK_EXPECTED_COUNTS, MOCK_POCKETBASE_PAGES } from './pocketbase.mock.js';


describe('PocketBase mapping', () => {
  it('should turn every PocketBase page into a page with its location out of the metadata', () => {
    const pages = MOCK_POCKETBASE_PAGES.map(toPageInput);

    expect(pages).toHaveLength(MOCK_POCKETBASE_PAGES.length);
    expect(pages[2]).toMatchObject({ type: 'chapter', lang: 'pt', location: 'preface' });
    expect(pages[2]?.metadata).not.toHaveProperty('location');
  });

  it.each(MOCK_BROKEN_RECORDS)('should stop on the broken record %j instead of importing it', (record) => {
    expect(() => toPageInput(record)).toThrow(InvalidPocketbaseRecordError);
  });

  it('should point PocketBase image links at the API media route, thumbnails included', () => {
    const content = '<img src="http://127.0.0.1:8090/api/files/col/rec/cover_ab12.webp?thumb=800x0">';
    const rewritten = rewriteMediaUrls(content, new Map([['cover_ab12.webp', 'f3a1.webp']]));

    expect(rewritten).toBe('<img src="/api/v1/media/f3a1.webp">');
  });

  it('should leave content without PocketBase images untouched', () => {
    const content = '<p>Sem imagens <a href="https://example.org/a.png">link</a></p>';

    expect(rewriteMediaUrls(content, new Map())).toBe(content);
  });

  it('should stop when a page uses an image PocketBase does not have', () => {
    const content = '<img src="http://127.0.0.1:8090/api/files/col/rec/missing.png">';

    expect(() => rewriteMediaUrls(content, new Map())).toThrow(InvalidPocketbaseRecordError);
  });

  it('should count pages per type and language', () => {
    const pages = MOCK_POCKETBASE_PAGES.map(toPageInput);

    expect(countByTypeAndLang(pages)).toEqual(MOCK_EXPECTED_COUNTS);
    expect(countByTypeAndLang([])).toEqual({});
  });
});
