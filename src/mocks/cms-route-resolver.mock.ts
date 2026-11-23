import type { CmsRouteData } from '../app/domain/models/cms.interface';
import { PageType } from '../app/domain/models/page-type.enum';

const PREFACE_PT: CmsRouteData = {
  pageId: 'preface-pt',
  title: 'Prefácio',
  lang: 'pt',
  type: PageType.Chapter,
  content: '<p>Prefácio PT</p>',
  metadata: { location: 'preface' },
  location: 'preface'
};

const HOME_DE: CmsRouteData = {
  pageId: 'home-de',
  title: 'Startseite',
  lang: 'de',
  type: PageType.Home,
  content: '<p>Inhalt DE</p>',
  metadata: { location: 'front-cover' },
  location: 'front-cover'
};

const WITHOUT_LOCATION: CmsRouteData = {
  pageId: 'plain-pt',
  title: 'Sem localização',
  lang: 'pt',
  type: PageType.Chapter,
  content: '<p>Plain</p>'
};

export const RESOLVER_PAGES: { readonly byPath: Record<string, CmsRouteData> } = {
  byPath: {
    'pt/prefacio': PREFACE_PT,
    de: HOME_DE,
    'pt/sem-localizacao': WITHOUT_LOCATION
  }
};
