import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ImportRefusedError, PocketbaseImporter } from './pocketbase-importer.js';
import type { ImportTarget, PocketbaseSource } from './pocketbase-importer.js';
import { MOCK_EXPECTED_COUNTS, MOCK_POCKETBASE_MEDIA, MOCK_POCKETBASE_PAGES, MOCK_POCKETBASE_URLS } from './pocketbase.mock.js';

function mockSource() {
  return {
    pages: vi.fn<PocketbaseSource['pages']>().mockResolvedValue(MOCK_POCKETBASE_PAGES),
    urls: vi.fn<PocketbaseSource['urls']>().mockResolvedValue(MOCK_POCKETBASE_URLS),
    media: vi.fn<PocketbaseSource['media']>().mockResolvedValue(MOCK_POCKETBASE_MEDIA),
  } satisfies PocketbaseSource;
}

function mockTarget() {
  return {
    countPages: vi.fn<ImportTarget['countPages']>().mockResolvedValue(0),
    importAll: vi.fn<ImportTarget['importAll']>().mockResolvedValue(undefined),
    countByTypeAndLang: vi.fn<ImportTarget['countByTypeAndLang']>().mockResolvedValue(MOCK_EXPECTED_COUNTS),
  } satisfies ImportTarget;
}

let source: ReturnType<typeof mockSource>;
let target: ReturnType<typeof mockTarget>;
let importer: PocketbaseImporter;

beforeEach(() => {
  let next = 0;
  source = mockSource();
  target = mockTarget();
  importer = new PocketbaseImporter(source, target, () => `00000000-0000-4000-8000-${String(++next).padStart(12, '0')}`);
});

describe('PocketbaseImporter', () => {
  it('should prove after import, all 40 pages are present, with the same counts by type and language as PocketBase, and a second import is rejected', async () => {
    const report = await importer.run();

    const batch = target.importAll.mock.calls[0]?.[0];
    expect(batch?.pages).toHaveLength(MOCK_POCKETBASE_PAGES.length);
    expect(report.counts).toEqual(MOCK_EXPECTED_COUNTS);
  });

  it('should refuse a second import when the database already has pages', async () => {
    target.countPages.mockResolvedValue(40);

    await expect(importer.run()).rejects.toBeInstanceOf(ImportRefusedError);
    expect(target.importAll).not.toHaveBeenCalled();
  });

  it('should refuse with a clear message when PocketBase is not running', async () => {
    source.pages.mockRejectedValue(new TypeError('fetch failed'));

    await expect(importer.run()).rejects.toThrow(/PocketBase/);
    expect(target.importAll).not.toHaveBeenCalled();
  });

  it('should fail when the imported counts differ from PocketBase', async () => {
    target.countByTypeAndLang.mockResolvedValue({ ...MOCK_EXPECTED_COUNTS, 'chapter/pt': 1 });

    await expect(importer.run()).rejects.toThrow(/chapter\/pt/);
  });

  it('should link each url to the new id of its page', async () => {
    await importer.run();

    const batch = target.importAll.mock.calls[0]?.[0];
    const preface = batch?.pages.find((page) => page.input.location === 'preface' && page.input.lang === 'pt');
    expect(batch?.urls.find((url) => url.url === 'prefacio')?.pageId).toBe(preface?.id);
  });

  it('should refuse a url that points to a page PocketBase does not have', async () => {
    source.urls.mockResolvedValue([{ id: 'u', url: 'lost', lang: 'pt', page_id: 'missing' }]);

    await expect(importer.run()).rejects.toBeInstanceOf(ImportRefusedError);
    expect(target.importAll).not.toHaveBeenCalled();
  });

  it('should import an empty PocketBase as an empty database', async () => {
    source.pages.mockResolvedValue([]);
    source.urls.mockResolvedValue([]);
    source.media.mockResolvedValue([]);
    target.countByTypeAndLang.mockResolvedValue({});

    await expect(importer.run()).resolves.toMatchObject({ counts: {} });
  });
});
