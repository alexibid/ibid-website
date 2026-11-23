import type { CmsPage, CmsUrl } from '../app/domain/models/cms.interface';
import { PageType } from '../app/domain/models/page-type.enum';
import type { ContentReadRepository } from '../app/domain/repositories/content.repository';

export const ALL_SUPPORTED_LANGUAGE_CODES: readonly string[] = ['pt', 'en', 'es', 'fr', 'de'];

export const MOCK_I18N_PAGES: CmsPage[] = [
  {
    id: 'home-pt',
    title: 'Início',
    content: '<p>Conteúdo PT</p>',
    type: PageType.Home,
    lang: 'pt',
    metadata: { location: 'front-cover' }
  },
  {
    id: 'home-en',
    title: 'Home',
    content: '<p>Content EN</p>',
    type: PageType.Home,
    lang: 'en',
    metadata: { location: 'front-cover' }
  },
  {
    id: 'home-es',
    title: 'Inicio',
    content: '<p>Contenido ES</p>',
    type: PageType.Home,
    lang: 'es',
    metadata: { location: 'front-cover' }
  },
  {
    id: 'home-fr',
    title: 'Accueil',
    content: '<p>Contenu FR</p>',
    type: PageType.Home,
    lang: 'fr',
    metadata: { location: 'front-cover' }
  },
  {
    id: 'home-de',
    title: 'Startseite',
    content: '<p>Inhalt DE</p>',
    type: PageType.Home,
    lang: 'de',
    metadata: { location: 'front-cover' }
  },
  {
    id: 'preface-pt',
    title: 'Prefácio',
    content: '<p>Prefácio PT</p>',
    type: PageType.Chapter,
    lang: 'pt',
    metadata: { location: 'preface' }
  },
  {
    id: 'preface-en',
    title: 'Preface',
    content: '<p>Preface EN</p>',
    type: PageType.Chapter,
    lang: 'en',
    metadata: { location: 'preface' }
  },
  {
    id: 'preface-es',
    title: 'Prefacio',
    content: '<p>Prefacio ES</p>',
    type: PageType.Chapter,
    lang: 'es',
    metadata: { location: 'preface' }
  },
  {
    id: 'preface-fr',
    title: 'Préface',
    content: '<p>Préface FR</p>',
    type: PageType.Chapter,
    lang: 'fr',
    metadata: { location: 'preface' }
  },
  {
    id: 'preface-de',
    title: 'Vorwort',
    content: '<p>Vorwort DE</p>',
    type: PageType.Chapter,
    lang: 'de',
    metadata: { location: 'preface' }
  }
];

function findPage(id: string): CmsPage {
  const found = MOCK_I18N_PAGES.find((page) => page.id === id);
  if (!found) {
    throw new Error(`Missing mock page: ${id}`);
  }
  return found;
}

export const MOCK_I18N_URLS: CmsUrl[] = [
  { id: 'url-home-pt', url: '', page_id: 'home-pt', lang: 'pt', expand: { page_id: findPage('home-pt') } },
  { id: 'url-home-en', url: '', page_id: 'home-en', lang: 'en', expand: { page_id: findPage('home-en') } },
  { id: 'url-home-es', url: '', page_id: 'home-es', lang: 'es', expand: { page_id: findPage('home-es') } },
  { id: 'url-home-fr', url: '', page_id: 'home-fr', lang: 'fr', expand: { page_id: findPage('home-fr') } },
  { id: 'url-home-de', url: '', page_id: 'home-de', lang: 'de', expand: { page_id: findPage('home-de') } },
  { id: 'url-preface-pt', url: 'prefacio', page_id: 'preface-pt', lang: 'pt', expand: { page_id: findPage('preface-pt') } },
  { id: 'url-preface-en', url: 'preface', page_id: 'preface-en', lang: 'en', expand: { page_id: findPage('preface-en') } },
  { id: 'url-preface-es', url: 'prefacio', page_id: 'preface-es', lang: 'es', expand: { page_id: findPage('preface-es') } },
  { id: 'url-preface-fr', url: 'preface', page_id: 'preface-fr', lang: 'fr', expand: { page_id: findPage('preface-fr') } },
  { id: 'url-preface-de', url: 'vorwort', page_id: 'preface-de', lang: 'de', expand: { page_id: findPage('preface-de') } }
];

export const MOCK_EMPTY_URLS: CmsUrl[] = [];

export function createMockContentReadRepository(
  pages: CmsPage[] = MOCK_I18N_PAGES,
  urls: CmsUrl[] = MOCK_I18N_URLS
): ContentReadRepository {
  return {
    async loadSections(type: PageType, lang: string): Promise<CmsPage[]> {
      return pages.filter((page) => page.type === type && page.lang === lang);
    },
    async getUrls(): Promise<CmsUrl[]> {
      return urls;
    },
    async getPages(query?: { type?: string; lang?: string }): Promise<CmsPage[]> {
      return pages.filter((page) => {
        if (query?.type && page.type !== query.type) {
          return false;
        }
        if (query?.lang && page.lang !== query.lang) {
          return false;
        }
        return true;
      });
    },
    async getPage(id: string): Promise<CmsPage> {
      const found = pages.find((page) => page.id === id);
      if (!found) {
        throw new Error(`Page not found: ${id}`);
      }
      return found;
    }
  };
}
