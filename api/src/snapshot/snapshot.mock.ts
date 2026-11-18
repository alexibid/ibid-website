import type { Page, Url } from '../content/content.model.js';
import type { ContentSnapshot } from './content-snapshot.js';

const BASE = { metadata: {}, createdAt: '2026-11-18T10:00:00.000Z', updatedAt: '2026-11-18T10:00:00.000Z' };

export const MOCK_UNSORTED_PAGES: readonly Page[] = [
  { ...BASE, id: 'c', title: 'Saída', content: '<p>Fim</p>', type: 'exit', lang: 'pt', location: 'back-cover' },
  {
    ...BASE,
    id: 'b',
    title: 'Prefácio',
    content: '<p><img src="/api/v1/media/b.webp"><img src="/api/v1/media/a.png"><img src="/api/v1/media/b.webp"></p>',
    type: 'chapter',
    lang: 'pt',
    location: 'preface',
  },
  { ...BASE, id: 'a', title: 'Capa', content: '<p>Olá</p>', type: 'home', lang: 'en', location: 'front-cover' },
  { ...BASE, id: 'd', title: 'Índice', content: '', type: 'chapter', lang: 'en', location: 'index' },
];

export const MOCK_UNSORTED_URLS: readonly Url[] = [
  { id: 'u2', url: 'prefacio', lang: 'pt', pageId: 'b' },
  { id: 'u1', url: 'cover', lang: 'en', pageId: 'a' },
];

export const MOCK_SNAPSHOT: ContentSnapshot = {
  version: 1,
  pages: [
    { id: 'a', title: 'Capa', content: '<p>Olá</p>', type: 'home', lang: 'en', location: 'front-cover', metadata: {} },
  ],
  urls: [{ url: 'cover', lang: 'en', pageId: 'a' }],
  media: ['a.png', 'b.webp'],
};

export const MOCK_DIRS = {
  contentDir: '/data/content',
  publicMediaDir: '/data/content-media',
  mediaDir: '/data/media',
} as const;

export const MOCK_UNSAFE_MEDIA: readonly string[] = ['../secret.env', 'nested/a.png', '..', ''];
