import type Quill from 'quill';
import type { vi } from 'vitest';
import type { CmsPage, CmsPagePayload, CmsUrl } from '../app/domain/models/cms.interface';
import { PageType } from '../app/domain/models/page-type.enum';
import type { AdminContentRepository } from '../app/domain/repositories/content.repository';

function isViNamespace(value: unknown): value is typeof vi {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'fn') === 'function'
  );
}

function getVi(): typeof vi {
  const candidate: unknown = Reflect.get(globalThis, 'vi');
  if (!isViNamespace(candidate)) {
    throw new Error('Vitest global vi is not available');
  }
  return candidate;
}

export interface AdminRepositoryMock extends AdminContentRepository {
  loadSections: ReturnType<typeof vi.fn<(type: PageType, lang: string) => Promise<CmsPage[]>>>;
  createUrl: ReturnType<typeof vi.fn<(data: Partial<CmsUrl>) => Promise<CmsUrl>>>;
  deleteUrl: ReturnType<typeof vi.fn<(id: string) => Promise<void>>>;
  getUrls: ReturnType<typeof vi.fn<() => Promise<CmsUrl[]>>>;
  getPages: ReturnType<typeof vi.fn<(query?: { type?: string; lang?: string }) => Promise<CmsPage[]>>>;
  getPage: ReturnType<typeof vi.fn<(id: string) => Promise<CmsPage>>>;
  createPage: ReturnType<typeof vi.fn<(data: Partial<CmsPage>) => Promise<CmsPage>>>;
  updatePage: ReturnType<typeof vi.fn<(id: string, data: Partial<CmsPage>) => Promise<CmsPage>>>;
  deletePage: ReturnType<typeof vi.fn<(id: string) => Promise<void>>>;
  uploadImage: ReturnType<typeof vi.fn<(file: File) => Promise<string>>>;
}

const PRIMARY_PAGE: CmsPage = {
  id: 'page-preface-pt',
  title: 'Prefácio',
  content: '<p>Conteúdo de teste</p>',
  type: PageType.Chapter,
  lang: 'pt',
  metadata: { location: 'preface' }
};

const SECONDARY_PAGE: CmsPage = {
  id: 'page-home-en',
  title: 'Front Cover',
  content: '<p>Cover copy</p>',
  type: PageType.Home,
  lang: 'en',
  metadata: { location: 'front-cover' }
};

const HOME_PT_PAGE: CmsPage = {
  id: 'page-home-pt',
  title: 'Capa',
  content: '<p>Capa PT</p>',
  type: PageType.Home,
  lang: 'pt',
  metadata: { location: 'front-cover' }
};

const CREATED_PAGE: CmsPage = {
  id: 'page-created-1',
  title: 'New Chapter',
  content: '<p>Created body</p>',
  type: PageType.Chapter,
  lang: 'pt',
  metadata: { location: 'about' }
};

const UPDATED_PAGE: CmsPage = {
  id: PRIMARY_PAGE.id,
  title: 'Updated Preface',
  content: '<p>Updated body</p>',
  type: PageType.Chapter,
  lang: 'pt',
  metadata: { location: 'preface' }
};

const PAGE_PAYLOAD: CmsPagePayload = {
  title: 'New Chapter',
  type: PageType.Chapter,
  lang: 'pt',
  content: '<p>Created body</p>',
  metadata: { location: 'about' }
};

const ALL_ADMIN_PAGES: CmsPage[] = [PRIMARY_PAGE, SECONDARY_PAGE];
const PT_HOME_PAGES: CmsPage[] = [HOME_PT_PAGE];
const EMPTY_PAGES: CmsPage[] = [];

export const ADMIN_PAGE_FIXTURES = {
  pages: ALL_ADMIN_PAGES,
  ptHomePages: PT_HOME_PAGES,
  primaryPage: PRIMARY_PAGE,
  secondaryPage: SECONDARY_PAGE,
  createdPage: CREATED_PAGE,
  updatedPage: UPDATED_PAGE,
  payload: PAGE_PAYLOAD,
  emptyPages: EMPTY_PAGES,
  unknownPageId: 'missing-page-id',
  unknownLocation: 'nonexistent-location'
};

const PRIMARY_URL: CmsUrl = {
  id: 'url-preface-pt',
  url: 'prefacio',
  page_id: PRIMARY_PAGE.id,
  lang: 'pt',
  expand: { page_id: PRIMARY_PAGE }
};

const SECONDARY_URL: CmsUrl = {
  id: 'url-home-en',
  url: '',
  page_id: SECONDARY_PAGE.id,
  lang: 'en',
  expand: { page_id: SECONDARY_PAGE }
};

const CREATED_URL: CmsUrl = {
  id: 'url-created-1',
  url: 'sobre',
  page_id: CREATED_PAGE.id,
  lang: 'pt',
  expand: { page_id: CREATED_PAGE }
};

const ALL_ADMIN_URLS: CmsUrl[] = [PRIMARY_URL, SECONDARY_URL];
const EMPTY_URLS: CmsUrl[] = [];
const CREATE_URL_PAYLOAD: Partial<CmsUrl> = {
  url: 'sobre',
  page_id: CREATED_PAGE.id,
  lang: 'pt'
};

export const ADMIN_URL_FIXTURES = {
  urls: ALL_ADMIN_URLS,
  rawApiUrlsExpanded: [
    {
      id: 'url-preface-pt',
      url: 'prefacio',
      lang: 'pt',
      pageId: PRIMARY_PAGE.id,
      page: {
        id: PRIMARY_PAGE.id,
        title: PRIMARY_PAGE.title,
        type: PRIMARY_PAGE.type,
        lang: PRIMARY_PAGE.lang,
        location: 'preface',
        metadata: { location: 'preface' }
      }
    },
    {
      id: 'url-home-en',
      url: '',
      lang: 'en',
      pageId: SECONDARY_PAGE.id,
      page: {
        id: SECONDARY_PAGE.id,
        title: SECONDARY_PAGE.title,
        type: SECONDARY_PAGE.type,
        lang: SECONDARY_PAGE.lang,
        location: 'front-cover',
        metadata: { location: 'front-cover' }
      }
    }
  ],
  primaryUrl: PRIMARY_URL,
  secondaryUrl: SECONDARY_URL,
  createdUrl: CREATED_URL,
  createPayload: CREATE_URL_PAYLOAD,
  emptyUrls: EMPTY_URLS
};

const E2E_INITIAL_PAGE: CmsPage = {
  id: 'page-1',
  title: 'Home Page',
  type: PageType.Home,
  lang: 'pt',
  content: '<p>Home content</p>',
  metadata: { location: 'index' }
};

export const ADMIN_E2E_FIXTURES = {
  initialTitle: E2E_INITIAL_PAGE.title,
  updatedTitle: 'Updated Home Title',
  pageEndpointFragment: `/api/v1/pages/${E2E_INITIAL_PAGE.id}`,
  createPageResponse(title: string): CmsPage {
    return { ...E2E_INITIAL_PAGE, title };
  },
  createUrlsResponse(title: string): readonly Record<string, unknown>[] {
    return [
      {
        id: 'u1',
        url: 'index',
        lang: E2E_INITIAL_PAGE.lang,
        pageId: E2E_INITIAL_PAGE.id,
        page: {
          id: E2E_INITIAL_PAGE.id,
          title,
          type: E2E_INITIAL_PAGE.type,
          lang: E2E_INITIAL_PAGE.lang,
          location: 'index',
          metadata: E2E_INITIAL_PAGE.metadata
        }
      }
    ];
  }
};

export const ADMIN_MEDIA_FIXTURES = {
  uploadUrl: '/assets/uploads/cover-preview.webp',
  uploadResponse: { url: '/assets/uploads/cover-preview.webp' },
  createImageFile(): File {
    return new File([new Uint8Array([137, 80, 78, 71])], 'cover-preview.png', { type: 'image/png' });
  },
  createMockQuill(): {
    editor: Quill;
    insertEmbed: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  } {
    const viApi = getVi();
    const insertEmbed = viApi.fn();
    const update = viApi.fn();
    const editor: Quill = Object.assign(Object.create(Object.prototype), {
      getModule: viApi.fn(() => undefined),
      root: document.createElement('div'),
      getSelection: viApi.fn(() => ({ index: 0, length: 0 })),
      insertEmbed,
      getLeaf: viApi.fn(() => [null, 0]),
      update
    });
    return { editor, insertEmbed, update };
  }
};

export const ADMIN_ERROR_FIXTURES = {
  unreachableMessage: 'Cannot reach the API server. Ensure ibid-website-api is running.',
  offlineResponse: { status: 0, statusText: 'Unknown Error' },
  unavailableResponse: { status: 503, statusText: 'Service Unavailable' },
  notFoundResponse: { status: 404, statusText: 'Not Found' }
};

export function createMockAdminRepository(overrides: Partial<AdminRepositoryMock> = {}): AdminRepositoryMock {
  const viApi = getVi();
  const pages = [...ADMIN_PAGE_FIXTURES.pages];
  const urls = [...ADMIN_URL_FIXTURES.urls];

  const base: AdminRepositoryMock = {
    loadSections: viApi.fn(async (type: PageType, lang: string) =>
      pages.filter((page) => page.type === type && page.lang === lang)
    ),
    getUrls: viApi.fn(async () => [...urls]),
    getPages: viApi.fn(async (query?: { type?: string; lang?: string }) =>
      pages.filter((page) => {
        if (query?.type && page.type !== query.type) return false;
        if (query?.lang && page.lang !== query.lang) return false;
        return true;
      })
    ),
    getPage: viApi.fn(async (id: string) => {
      const found = pages.find((page) => page.id === id);
      if (!found) throw new Error(`Page not found: ${id}`);
      return found;
    }),
    createPage: viApi.fn(async (data: Partial<CmsPage>) => ({
      ...ADMIN_PAGE_FIXTURES.createdPage,
      ...data
    })),
    updatePage: viApi.fn(async (id: string, data: Partial<CmsPage>) => ({
      ...ADMIN_PAGE_FIXTURES.updatedPage,
      ...data,
      id
    })),
    deletePage: viApi.fn(async (_id: string) => undefined),
    createUrl: viApi.fn(async (data: Partial<CmsUrl>) => ({
      ...ADMIN_URL_FIXTURES.createdUrl,
      ...data
    })),
    deleteUrl: viApi.fn(async (_id: string) => undefined),
    uploadImage: viApi.fn(async (_file: File) => ADMIN_MEDIA_FIXTURES.uploadUrl)
  };

  return {
    ...base,
    ...overrides
  };
}
