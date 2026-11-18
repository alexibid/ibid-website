import type { Page, PageInput, Url } from './content.model.js';

export const MOCK_PAGE_ID = '0b9c6f1e-6a4f-4a7e-9a55-2a7f7c3b1d10';

export const MOCK_PAGE: Page = {
  id: MOCK_PAGE_ID,
  title: 'Prefácio',
  content: '<p>Era uma vez <img src="/api/v1/media/cover.webp" alt="capa"></p>',
  type: 'chapter',
  lang: 'pt',
  location: 'preface',
  metadata: { order: 1 },
  createdAt: '2026-11-18T10:00:00.000Z',
  updatedAt: '2026-11-18T10:00:00.000Z',
};

export const MOCK_PAGE_INPUTS = {
  valid: { title: 'Prefácio', content: '<p>Olá</p>', type: 'chapter', lang: 'pt', location: 'preface' },
  minimal: { title: 'Capa', content: '', type: 'home', lang: 'en' },
  withMetadata: { title: 'Saída', content: '<p>Fim</p>', type: 'exit', lang: 'fr', metadata: { order: 9 } },
} as const satisfies Readonly<Record<string, PageInput>>;

export const MOCK_INVALID_PAGE_BODIES: readonly unknown[] = [
  'not an object',
  42,
  [],
  {},
  { title: 'x', content: '', type: 'blog', lang: 'pt' },
  { title: 'x', content: '', type: 'chapter', lang: 'de' },
  { title: '', content: '', type: 'chapter', lang: 'pt' },
  { title: 7, content: '', type: 'chapter', lang: 'pt' },
  { title: 'x', content: 5, type: 'chapter', lang: 'pt' },
  { title: 'x', content: '', type: 'chapter', lang: 'pt', location: 3 },
  { title: 'x', content: '', type: 'chapter', lang: 'pt', metadata: 'nope' },
  { title: 'x', content: '', type: 'chapter', lang: 'pt', id: MOCK_PAGE_ID },
  { title: 'x', content: '', type: 'chapter', lang: 'pt', createdAt: '2026-01-01' },
];

export const MOCK_PAGE_PATCHES = {
  title: { title: 'Prefácio revisto' },
  content: { content: '<p>Novo texto</p>' },
  several: { title: 'Novo', lang: 'es', metadata: { order: 2 } },
} as const;

export const MOCK_INVALID_PAGE_PATCHES: readonly unknown[] = [
  {},
  null,
  'title',
  { id: MOCK_PAGE_ID },
  { title: '' },
  { type: 'blog' },
  { updatedAt: '2026-11-18' },
  { title: 'ok', unknownField: true },
];

export const MOCK_URL: Url = { id: '9a1d2e3f-0000-4000-8000-000000000001', url: 'prefacio', lang: 'pt', pageId: MOCK_PAGE_ID };

export const MOCK_URL_BODIES = {
  valid: { url: 'prefacio', lang: 'pt', pageId: MOCK_PAGE_ID },
  invalid: [
    {},
    { url: '', lang: 'pt', pageId: MOCK_PAGE_ID },
    { url: 'x', lang: 'xx', pageId: MOCK_PAGE_ID },
    { url: 'x', lang: 'pt' },
    { url: 'x', lang: 'pt', pageId: MOCK_PAGE_ID, id: 'forced' },
  ] as readonly unknown[],
} as const;
