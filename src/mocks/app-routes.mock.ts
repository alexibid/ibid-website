import type { CmsRouteData, CmsRouteParams } from '../app/domain/models/cms.interface';
import { PageType } from '../app/domain/models/page-type.enum';

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
