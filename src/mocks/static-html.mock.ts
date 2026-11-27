import { vi } from 'vitest';
import type { CmsPage, CmsUrl } from '../app/domain/models/cms.interface';
import { PageType } from '../app/domain/models/page-type.enum';
import type { ContentReadRepository } from '../app/domain/repositories/content.repository';

export interface ContentReadRepositoryMock extends ContentReadRepository {
  loadSections: ReturnType<typeof vi.fn<(type: PageType, lang: string) => Promise<CmsPage[]>>>;
  getUrls: ReturnType<typeof vi.fn<() => Promise<CmsUrl[]>>>;
  getPages: ReturnType<typeof vi.fn<(query?: { type?: string; lang?: string }) => Promise<CmsPage[]>>>;
  getPage: ReturnType<typeof vi.fn<(id: string) => Promise<CmsPage>>>;
}

export interface Deferred<T> {
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
  readonly reject: (reason?: unknown) => void;
}

export function createDeferred<T>(): Deferred<T> {
  let resolveFn: (value: T) => void = () => undefined;
  let rejectFn: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolveFn = resolve;
    rejectFn = reject;
  });
  return { promise, resolve: resolveFn, reject: rejectFn };
}

const HOME_COVER_PT: CmsPage = {
  id: 'home-pt-cover',
  title: 'Capa',
  content: '<p>Capa inicial</p>',
  type: PageType.Home,
  lang: 'pt',
  metadata: { location: 'front-cover' }
};

const HOME_INDEX_PT: CmsPage = {
  id: 'home-pt-index',
  title: 'Índice',
  content: '<p>Índice do livro</p>',
  type: PageType.Home,
  lang: 'pt',
  metadata: { location: 'index' }
};

const CHAPTER_PT_1: CmsPage = {
  id: 'chapter-pt-1',
  title: 'Capítulo I',
  content: '<p>Capítulo I conteúdo</p>',
  type: PageType.Chapter,
  lang: 'pt',
  metadata: { location: 'I' }
};

const CHAPTER_EN_2: CmsPage = {
  id: 'chapter-en-2',
  title: 'Chapter II',
  content: '<p>Chapter II content</p>',
  type: PageType.Chapter,
  lang: 'en',
  metadata: { location: 'II' }
};

const EXIT_PT_CONTACT: CmsPage = {
  id: 'exit-pt-contact',
  title: 'Contactos',
  content: '<p>Contactos PT</p>',
  type: PageType.Exit,
  lang: 'pt',
  metadata: { location: 'contact-form' }
};

const ALL_STATIC_PAGES: CmsPage[] = [
  HOME_COVER_PT,
  HOME_INDEX_PT,
  CHAPTER_PT_1,
  CHAPTER_EN_2,
  EXIT_PT_CONTACT
];

const STATIC_MANIFEST = {
  version: 1,
  pages: [
    {
      id: HOME_COVER_PT.id,
      title: HOME_COVER_PT.title,
      type: HOME_COVER_PT.type,
      lang: HOME_COVER_PT.lang,
      location: 'front-cover',
      metadata: HOME_COVER_PT.metadata
    },
    {
      id: HOME_INDEX_PT.id,
      title: HOME_INDEX_PT.title,
      type: HOME_INDEX_PT.type,
      lang: HOME_INDEX_PT.lang,
      location: 'index',
      metadata: HOME_INDEX_PT.metadata
    },
    {
      id: CHAPTER_PT_1.id,
      title: CHAPTER_PT_1.title,
      type: CHAPTER_PT_1.type,
      lang: CHAPTER_PT_1.lang,
      location: 'I',
      metadata: CHAPTER_PT_1.metadata
    },
    {
      id: CHAPTER_EN_2.id,
      title: CHAPTER_EN_2.title,
      type: CHAPTER_EN_2.type,
      lang: CHAPTER_EN_2.lang,
      location: 'II',
      metadata: CHAPTER_EN_2.metadata
    },
    {
      id: EXIT_PT_CONTACT.id,
      title: EXIT_PT_CONTACT.title,
      type: EXIT_PT_CONTACT.type,
      lang: EXIT_PT_CONTACT.lang,
      location: 'contact-form',
      metadata: EXIT_PT_CONTACT.metadata
    }
  ],
  urls: [
    { id: 'url-home-pt-cover', url: '', lang: 'pt', pageId: HOME_COVER_PT.id },
    { id: 'url-chapter-pt-1', url: 'capitulo-1', lang: 'pt', pageId: CHAPTER_PT_1.id },
    { id: 'url-chapter-en-2', url: 'chapter-2', lang: 'en', pageId: CHAPTER_EN_2.id },
    { id: 'url-exit-pt-contact', url: 'contactos', lang: 'pt', pageId: EXIT_PT_CONTACT.id }
  ],
  media: []
};

const TRAVERSAL_PAGE_ID = 'bad-lang-page';

const TRAVERSAL_MANIFEST = {
  version: 1,
  pages: [
    {
      id: TRAVERSAL_PAGE_ID,
      title: 'Traversal',
      type: PageType.Chapter,
      lang: '../en',
      location: 'I',
      metadata: { location: 'I' }
    }
  ],
  urls: [
    { id: 'url-traversal', url: 'traversal', lang: 'en', pageId: TRAVERSAL_PAGE_ID }
  ],
  media: []
};

const STATIC_URLS: CmsUrl[] = [
  {
    id: 'url-home-pt-cover',
    url: '',
    page_id: HOME_COVER_PT.id,
    lang: 'pt',
    expand: { page_id: { ...HOME_COVER_PT, content: '' } }
  },
  {
    id: 'url-chapter-pt-1',
    url: 'capitulo-1',
    page_id: CHAPTER_PT_1.id,
    lang: 'pt',
    expand: { page_id: { ...CHAPTER_PT_1, content: '' } }
  },
  {
    id: 'url-chapter-en-2',
    url: 'chapter-2',
    page_id: CHAPTER_EN_2.id,
    lang: 'en',
    expand: { page_id: { ...CHAPTER_EN_2, content: '' } }
  },
  {
    id: 'url-exit-pt-contact',
    url: 'contactos',
    page_id: EXIT_PT_CONTACT.id,
    lang: 'pt',
    expand: { page_id: { ...EXIT_PT_CONTACT, content: '' } }
  }
];

const HOME_SECTIONS: CmsPage[] = [HOME_COVER_PT, HOME_INDEX_PT];
const EXIT_SECTIONS: CmsPage[] = [EXIT_PT_CONTACT];

export const STATIC_HTML_FIXTURES = {
  routesJsonUrl: '/pages/routes.json',
  chapterHtmlUrl: `/pages/${CHAPTER_PT_1.lang}/${CHAPTER_PT_1.id}.html`,
  homeCoverHtmlUrl: `/pages/${HOME_COVER_PT.lang}/${HOME_COVER_PT.id}.html`,
  homeIndexHtmlUrl: `/pages/${HOME_INDEX_PT.lang}/${HOME_INDEX_PT.id}.html`,
  manifest: STATIC_MANIFEST,
  emptyManifest: { version: 1, pages: [], urls: [], media: [] },
  traversalManifest: TRAVERSAL_MANIFEST,
  traversalPageId: TRAVERSAL_PAGE_ID,
  urls: STATIC_URLS,
  pages: ALL_STATIC_PAGES,
  homeSections: HOME_SECTIONS,
  exitSections: EXIT_SECTIONS,
  chapterPage: CHAPTER_PT_1,
  secondaryChapterPage: CHAPTER_EN_2,
  inlineChapterInput: {
    pageId: CHAPTER_PT_1.id,
    title: CHAPTER_PT_1.title,
    lang: CHAPTER_PT_1.lang,
    type: CHAPTER_PT_1.type,
    content: '<p>Inline chapter body</p>',
    metadata: CHAPTER_PT_1.metadata,
    location: 'I'
  },
  emptyContentChapterInput: {
    pageId: CHAPTER_PT_1.id,
    title: CHAPTER_PT_1.title,
    lang: CHAPTER_PT_1.lang,
    type: CHAPTER_PT_1.type,
    content: '',
    metadata: CHAPTER_PT_1.metadata,
    location: 'I'
  },
  invalidPathIds: ['../secret', 'pt/../../etc/passwd', 'bad id', 'a/b', ''],
  missingPageId: 'non-existent-page',
  httpError500: { status: 500, statusText: 'Internal Server Error' },
  httpError404: { status: 404, statusText: 'Not Found' }
};

export const CONTACT_FORM_FIXTURES = {
  validName: 'Alex',
  validEmail: 'test@example.com',
  invalidEmail: 'invalid-email',
  validMessage: 'Hello, this is a valid message.',
  editedName: 'Maria',
  editedEmail: 'maria@example.com',
  editedMessage: 'Line 1 Line 2',
  botName: 'Bot',
  botEmail: 'bot@example.com',
  botMessage: 'Spam message content',
  honeypotValue: 'spam-value',
  doubleSubmitEmail: 'alex@example.com',
  exitLang: 'pt',
  contactEndpoint: '/api/v1/contact',
  viewportWidth: 400,
  scrollWidth: 1200,
  editingKeys: [' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Backspace', 'Enter'] as const,
  createSuccessResponse: () => new Response(null, { status: 200 })
};

export function createMockContentReadRepository(
  overrides: Partial<ContentReadRepositoryMock> = {}
): ContentReadRepositoryMock {
  const base: ContentReadRepositoryMock = {
    loadSections: vi.fn(async (type: PageType, lang: string) =>
      ALL_STATIC_PAGES.filter((page) => page.type === type && page.lang === lang)
    ),
    getUrls: vi.fn(async () => [...STATIC_URLS]),
    getPages: vi.fn(async (query?: { type?: string; lang?: string }) =>
      ALL_STATIC_PAGES.filter((page) => {
        if (query?.type && page.type !== query.type) {
          return false;
        }
        if (query?.lang && page.lang !== query.lang) {
          return false;
        }
        return true;
      })
    ),
    getPage: vi.fn(async (id: string) => {
      const found = ALL_STATIC_PAGES.find((page) => page.id === id);
      if (!found) {
        throw new Error(`Page not found: ${id}`);
      }
      return found;
    })
  };

  return {
    ...base,
    ...overrides
  };
}
