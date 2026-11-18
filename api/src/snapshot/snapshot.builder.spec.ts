import { describe, expect, it, vi } from 'vitest';
import { SnapshotBuilder } from './snapshot.builder.js';
import { MOCK_UNSORTED_PAGES, MOCK_UNSORTED_URLS } from './snapshot.mock.js';

function builderWith(pages = MOCK_UNSORTED_PAGES, urls = MOCK_UNSORTED_URLS) {
  return new SnapshotBuilder({ list: vi.fn().mockResolvedValue(pages) }, { list: vi.fn().mockResolvedValue(urls) });
}


describe('SnapshotBuilder', () => {
  it('should build the snapshot from every page, ordered by type, language and location', async () => {
    const snapshot = await builderWith().build();

    expect(snapshot.version).toBe(1);
    expect(snapshot.pages.map((page) => page.id)).toEqual(['d', 'b', 'c', 'a']);
  });

  it('should point images at the published media folder and list each image once', async () => {
    const snapshot = await builderWith().build();
    const preface = snapshot.pages.find((page) => page.id === 'b');

    expect(preface?.content).not.toContain('/api/v1/media/');
    expect(preface?.content).toContain('/content-media/b.webp');
    expect(snapshot.media).toEqual(['a.png', 'b.webp']);
  });

  it('should give the same snapshot for the same content, whatever the order it was read in', async () => {
    const first = await builderWith().build();
    const second = await builderWith([...MOCK_UNSORTED_PAGES].reverse(), [...MOCK_UNSORTED_URLS].reverse()).build();

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('should leave timestamps out so an untouched page never changes the file', async () => {
    const snapshot = await builderWith().build();

    expect(JSON.stringify(snapshot)).not.toContain('createdAt');
    expect(JSON.stringify(snapshot)).not.toContain('updatedAt');
  });

  it('should build an empty snapshot when there is no content', async () => {
    const snapshot = await builderWith([], []).build();

    expect(snapshot).toEqual({ version: 1, pages: [], urls: [], media: [] });
  });
});
