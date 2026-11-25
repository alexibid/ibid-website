import { PORTFOLIO_CONTENT_FIXTURES, type PortfolioMockEntry } from './portfolio-content.mock';

function withChapterImage(src: string): readonly PortfolioMockEntry[] {
  return PORTFOLIO_CONTENT_FIXTURES.validEntries.map((entry) =>
    entry.lang === 'en' && entry.location === 'V'
      ? { ...entry, content: `<p>Chapter text.</p><img src="${src}" alt="Chapter image">` }
      : entry
  );
}

export const PORTFOLIO_IMAGE_SOURCE_FIXTURES = {
  imagesFolderSource: withChapterImage('/images/hero.webp'),
  httpsSource: withChapterImage('https://images.unsplash.com/photo-1'),
  legacyContentMediaSource: withChapterImage('/content-media/hero.webp')
};

export const LEGACY_MEDIA_FIXTURES = {
  rows: [
    {
      id: 'media-legacy',
      filename: 'old.webp',
      url: '/content-media/old.webp',
      mimeType: 'image/webp',
      sizeBytes: 1024
    },
    {
      id: 'media-current',
      filename: 'new.webp',
      url: '/images/new.webp',
      mimeType: 'image/webp',
      sizeBytes: 2048
    }
  ],
  currentRowId: 'media-current'
};

export const SANITIZER_IMAGE_FIXTURES = {
  imagesFolderHtml: '<p>Text</p><img src="/images/hero.webp" alt="Hero" onerror="alert(1)">'
};
