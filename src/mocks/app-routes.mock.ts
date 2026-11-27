import type { CmsPage, CmsRouteData, CmsRouteParams, CmsUrl } from '../app/domain/models/cms.interface';
import { PageType } from '../app/domain/models/page-type.enum';
import type { ContentReadRepository } from '../app/domain/repositories/content.repository';

const PUBLISHED_CHAPTER: CmsRouteData = {
  pageId: 'page-preface-pt',
  title: 'Prefácio',
  lang: 'pt',
  type: PageType.Chapter,
  content: '<p>Prefácio</p>',
  location: 'preface'
};

export const PUBLIC_NAVIGATION_FIXTURES = {
  chapterUrl: '/pt/prefacio',
  chapterPath: 'pt/prefacio',
  chapterType: PageType.Chapter,
  chapter: PUBLISHED_CHAPTER,
  adminUrl: '/admin'
};

export const ADMIN_NAVIGATION_FIXTURES = {
  adminUrl: '/admin',
  heading: 'Website Administration',
  manageLinks: ['/admin/pt', '/admin/en', '/admin/es', '/admin/fr', '/admin/de'],
  loginMarkers: ['password', 'login'],
  toolbar: [
    ['bold', 'italic', 'underline', 'strike'],
    ['blockquote', 'code-block'],
    [{ header: 1 }, { header: 2 }],
    ['link', 'image']
  ]
};

const PRERENDER_PARAMS: readonly CmsRouteParams[] = [
  { lang: 'pt', slug: '' },
  { lang: 'pt', slug: 'prefacio' },
  { lang: 'en', slug: '' },
  { lang: 'en', slug: 'preface' },
  { lang: 'es', slug: '' },
  { lang: 'es', slug: 'prefacio' },
  { lang: 'fr', slug: '' },
  { lang: 'fr', slug: 'preface' },
  { lang: 'de', slug: '' },
  { lang: 'de', slug: 'vorwort' }
];

export const PRERENDER_FIXTURES = {
  languages: ['pt', 'en', 'es', 'fr', 'de'],
  params: PRERENDER_PARAMS,
  pagePaths: [
    'pt',
    'pt/prefacio',
    'en',
    'en/preface',
    'es',
    'es/prefacio',
    'fr',
    'fr/preface',
    'de',
    'de/vorwort'
  ]
};

function bookPage(id: string, type: PageType, location: string, title: string): CmsPage {
  return { id, title, type, lang: 'es', content: `<p>${title}</p>`, metadata: { location } };
}

const BOOK_COVER = bookPage('es-cover', PageType.Home, 'front-cover', 'Alexandre Santos — Ingeniero Frontend');
const BOOK_PREFACE = bookPage('es-preface', PageType.Home, 'preface', 'Presentación');
const BOOK_INDEX = bookPage('es-index', PageType.Home, 'index', 'Índice');
const BOOK_CHAPTER = bookPage('es-chapter', PageType.Chapter, 'I', 'Trayectoria Frontend');
const BOOK_PRODUCT: CmsPage = {
  ...bookPage('es-product', PageType.Chapter, 'III', 'Oh Save Me! — finanzas personales'),
  metadata: { location: 'III', product: true }
};
const BOOK_EXIT = bookPage('es-exit', PageType.Exit, 'contact-form', 'Formulario de Contacto');

const BOOK_PAGES: readonly CmsPage[] = [
  BOOK_COVER, BOOK_PREFACE, BOOK_INDEX, BOOK_CHAPTER, BOOK_PRODUCT, BOOK_EXIT
];

function bookUrl(url: string, page: CmsPage): CmsUrl {
  return { id: `url-${page.id}`, url, page_id: page.id, lang: page.lang, expand: { page_id: page } };
}

const BOOK_URLS: readonly CmsUrl[] = [
  bookUrl('', BOOK_COVER),
  bookUrl('', BOOK_PREFACE),
  bookUrl('indice', BOOK_INDEX),
  bookUrl('trayectoria-frontend', BOOK_CHAPTER),
  bookUrl('oh-save-me', BOOK_PRODUCT),
  bookUrl('contacto', BOOK_EXIT)
];

export const PUBLISHED_BOOK = {
  lang: 'es',
  homeUrl: '/es',
  indexUrl: '/es/indice',
  chapterUrl: '/es/trayectoria-frontend',
  productUrl: '/es/oh-save-me',
  exitUrl: '/es/contacto',
  unknownUrl: '/es/pagina-que-no-existe',
  coverTitle: BOOK_COVER.title,
  indexTitle: BOOK_INDEX.title,
  chapterTitle: BOOK_CHAPTER.title,
  documentTitles: [
    { url: '/es', title: `ibid. | ${BOOK_COVER.title}` },
    { url: '/es/indice', title: `ibid. | ${BOOK_INDEX.title}` },
    { url: '/es/trayectoria-frontend', title: `ibid. | ${BOOK_CHAPTER.title}` },
    { url: '/es/oh-save-me', title: `${BOOK_PRODUCT.title} | ibid.` },
    { url: '/es/contacto', title: `ibid. | ${BOOK_EXIT.title}` }
  ],
  menuLinks: ['/es/indice', '/es/trayectoria-frontend', '/es/oh-save-me', '/es/contacto'],
  indexRevealDelayMs: 5000
};

export function createPublishedBookRepository(): ContentReadRepository {
  return {
    loadSections: async (type, lang) =>
      BOOK_PAGES.filter((page) => page.type === type && page.lang === lang),
    getUrls: async () => [...BOOK_URLS],
    getPages: async () => [...BOOK_PAGES],
    getPage: async (id) => {
      const found = BOOK_PAGES.find((page) => page.id === id);
      if (!found) {
        throw new Error(`Page not found: ${id}`);
      }
      return found;
    }
  };
}
