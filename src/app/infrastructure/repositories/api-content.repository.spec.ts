import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, type TestRequest } from '@angular/common/http/testing';
import { ApiContentRepository, ApiUnreachableError } from './api-content.repository';
import { BYPASS_GLOBAL_ERROR } from '../interceptors/error.interceptor';
import { PageType } from '../../domain/models/page-type.enum';
import {
  ADMIN_ERROR_FIXTURES,
  ADMIN_MEDIA_FIXTURES,
  ADMIN_PAGE_FIXTURES,
  ADMIN_URL_FIXTURES
} from '../../../mocks/admin.mock';

function expectAnonymousRequest(req: TestRequest): void {
  expect(req.request.withCredentials).toBe(false);
  expect(req.request.headers.has('Authorization')).toBe(false);
  expect(req.request.headers.has('Cookie')).toBe(false);
}

function expectNoCacheReadRequest(req: TestRequest): void {
  expectAnonymousRequest(req);
  expect(req.request.headers.get('Cache-Control')).toBe('no-cache');
}

describe('ApiContentRepository', () => {
  let repo: ApiContentRepository;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ApiContentRepository
      ]
    });

    repo = TestBed.inject(ApiContentRepository);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('should fetch urls via GET /api/v1/urls?expand=page with Cache-Control no-cache and zero credentials', async () => {
    const urlsPromise = repo.getUrls();
    const urlsReq = httpMock.expectOne((req) => req.url === '/api/v1/urls' && req.params.get('expand') === 'page');
    expect(urlsReq.request.method).toBe('GET');
    expect(urlsReq.request.context.get(BYPASS_GLOBAL_ERROR)).toBe(true);
    expectNoCacheReadRequest(urlsReq);
    urlsReq.flush(ADMIN_URL_FIXTURES.rawApiUrlsExpanded);

    const joined = await urlsPromise;
    expect(joined).toHaveLength(2);
    expect(joined[0].page_id).toBe(ADMIN_PAGE_FIXTURES.primaryPage.id);
    expect(joined[0].expand?.page_id?.id).toBe(ADMIN_PAGE_FIXTURES.primaryPage.id);
    expect(joined[1].page_id).toBe(ADMIN_PAGE_FIXTURES.secondaryPage.id);
    expect(joined[1].expand?.page_id?.id).toBe(ADMIN_PAGE_FIXTURES.secondaryPage.id);

    const emptyPromise = repo.getUrls();
    const emptyReq = httpMock.expectOne((req) => req.url === '/api/v1/urls' && req.params.get('expand') === 'page');
    expectNoCacheReadRequest(emptyReq);
    emptyReq.flush(ADMIN_URL_FIXTURES.emptyUrls);
    expect(await emptyPromise).toEqual([]);
  });

  it('should fetch sections via GET /api/v1/pages?type=...&lang=... with Cache-Control no-cache and zero credentials', async () => {
    const sectionsPromise = repo.loadSections(PageType.Home, 'pt');
    const sectionsReq = httpMock.expectOne((req) => req.url === '/api/v1/pages');
    expect(sectionsReq.request.method).toBe('GET');
    expect(sectionsReq.request.params.get('type')).toBe(PageType.Home);
    expect(sectionsReq.request.params.get('lang')).toBe('pt');
    expect(sectionsReq.request.context.get(BYPASS_GLOBAL_ERROR)).toBe(true);
    expectNoCacheReadRequest(sectionsReq);
    sectionsReq.flush(ADMIN_PAGE_FIXTURES.ptHomePages);

    expect(await sectionsPromise).toEqual(ADMIN_PAGE_FIXTURES.ptHomePages);
  });

  it('should fetch pages and single page via GET /api/v1/pages and GET /api/v1/pages/:id with Cache-Control no-cache', async () => {
    const listPromise = repo.getPages({ type: PageType.Chapter, lang: 'pt' });
    const listReq = httpMock.expectOne((req) => req.url === '/api/v1/pages');
    expect(listReq.request.method).toBe('GET');
    expect(listReq.request.context.get(BYPASS_GLOBAL_ERROR)).toBe(true);
    expect(listReq.request.params.get('type')).toBe(PageType.Chapter);
    expect(listReq.request.params.get('lang')).toBe('pt');
    expectNoCacheReadRequest(listReq);
    listReq.flush(ADMIN_PAGE_FIXTURES.pages);
    expect(await listPromise).toEqual(ADMIN_PAGE_FIXTURES.pages);

    const emptyQueryPromise = repo.getPages();
    const emptyQueryReq = httpMock.expectOne('/api/v1/pages');
    expect(emptyQueryReq.request.params.keys()).toEqual([]);
    expectNoCacheReadRequest(emptyQueryReq);
    emptyQueryReq.flush(ADMIN_PAGE_FIXTURES.emptyPages);
    expect(await emptyQueryPromise).toEqual(ADMIN_PAGE_FIXTURES.emptyPages);

    const singlePromise = repo.getPage(ADMIN_PAGE_FIXTURES.primaryPage.id);
    const singleReq = httpMock.expectOne(`/api/v1/pages/${ADMIN_PAGE_FIXTURES.primaryPage.id}`);
    expect(singleReq.request.method).toBe('GET');
    expect(singleReq.request.context.get(BYPASS_GLOBAL_ERROR)).toBe(true);
    expectNoCacheReadRequest(singleReq);
    singleReq.flush(ADMIN_PAGE_FIXTURES.primaryPage);
    expect(await singlePromise).toEqual(ADMIN_PAGE_FIXTURES.primaryPage);
  });

  it('should create, update, and delete pages via /api/v1/pages with zero credentials and BYPASS_GLOBAL_ERROR', async () => {
    const createPromise = repo.createPage(ADMIN_PAGE_FIXTURES.payload);
    const createReq = httpMock.expectOne('/api/v1/pages');
    expect(createReq.request.method).toBe('POST');
    expect(createReq.request.context.get(BYPASS_GLOBAL_ERROR)).toBe(true);
    expectAnonymousRequest(createReq);
    expect(createReq.request.body).toEqual(ADMIN_PAGE_FIXTURES.payload);
    createReq.flush(ADMIN_PAGE_FIXTURES.createdPage);
    expect(await createPromise).toEqual(ADMIN_PAGE_FIXTURES.createdPage);

    const updatePromise = repo.updatePage(ADMIN_PAGE_FIXTURES.primaryPage.id, ADMIN_PAGE_FIXTURES.payload);
    const updateReq = httpMock.expectOne(`/api/v1/pages/${ADMIN_PAGE_FIXTURES.primaryPage.id}`);
    expect(['PATCH', 'PUT']).toContain(updateReq.request.method);
    expect(updateReq.request.context.get(BYPASS_GLOBAL_ERROR)).toBe(true);
    expectAnonymousRequest(updateReq);
    updateReq.flush(ADMIN_PAGE_FIXTURES.updatedPage);
    expect(await updatePromise).toEqual(ADMIN_PAGE_FIXTURES.updatedPage);

    const deletePromise = repo.deletePage(ADMIN_PAGE_FIXTURES.primaryPage.id);
    const deleteReq = httpMock.expectOne(`/api/v1/pages/${ADMIN_PAGE_FIXTURES.primaryPage.id}`);
    expect(deleteReq.request.method).toBe('DELETE');
    expect(deleteReq.request.context.get(BYPASS_GLOBAL_ERROR)).toBe(true);
    expectAnonymousRequest(deleteReq);
    deleteReq.flush(null);
    await deletePromise;
  });

  it('should create and delete urls and upload media via /api/v1 with zero credentials and BYPASS_GLOBAL_ERROR', async () => {
    const createUrlPromise = repo.createUrl(ADMIN_URL_FIXTURES.createPayload);
    const createUrlReq = httpMock.expectOne('/api/v1/urls');
    expect(createUrlReq.request.method).toBe('POST');
    expect(createUrlReq.request.context.get(BYPASS_GLOBAL_ERROR)).toBe(true);
    expectAnonymousRequest(createUrlReq);
    createUrlReq.flush(ADMIN_URL_FIXTURES.createdUrl);
    expect(await createUrlPromise).toEqual(ADMIN_URL_FIXTURES.createdUrl);

    const deleteUrlPromise = repo.deleteUrl(ADMIN_URL_FIXTURES.primaryUrl.id);
    const deleteUrlReq = httpMock.expectOne(`/api/v1/urls/${ADMIN_URL_FIXTURES.primaryUrl.id}`);
    expect(deleteUrlReq.request.method).toBe('DELETE');
    expect(deleteUrlReq.request.context.get(BYPASS_GLOBAL_ERROR)).toBe(true);
    expectAnonymousRequest(deleteUrlReq);
    deleteUrlReq.flush(null);
    await deleteUrlPromise;

    const imageFile = ADMIN_MEDIA_FIXTURES.createImageFile();
    const uploadPromise = repo.uploadImage(imageFile);
    const uploadReq = httpMock.expectOne('/api/v1/media');
    expect(uploadReq.request.method).toBe('POST');
    expect(uploadReq.request.context.get(BYPASS_GLOBAL_ERROR)).toBe(true);
    expectAnonymousRequest(uploadReq);
    expect(uploadReq.request.body instanceof FormData).toBe(true);
    uploadReq.flush(ADMIN_MEDIA_FIXTURES.uploadResponse);
    expect(await uploadPromise).toBe(ADMIN_MEDIA_FIXTURES.uploadUrl);
  });

  it('should throw ApiUnreachableError on status 0 or 503 for reads and mutations', async () => {
    const urlsOffline = repo.getUrls();
    httpMock
      .expectOne((req) => req.url === '/api/v1/urls' && req.params.get('expand') === 'page')
      .flush(null, ADMIN_ERROR_FIXTURES.offlineResponse);
    await expect(urlsOffline).rejects.toBeInstanceOf(ApiUnreachableError);

    const sectionsUnavailable = repo.loadSections(PageType.Home, 'pt');
    httpMock
      .expectOne((req) => req.url === '/api/v1/pages')
      .flush(null, ADMIN_ERROR_FIXTURES.unavailableResponse);
    await expect(sectionsUnavailable).rejects.toBeInstanceOf(ApiUnreachableError);

    const getPageOffline = repo.getPage(ADMIN_PAGE_FIXTURES.primaryPage.id);
    httpMock
      .expectOne(`/api/v1/pages/${ADMIN_PAGE_FIXTURES.primaryPage.id}`)
      .flush(null, ADMIN_ERROR_FIXTURES.offlineResponse);
    await expect(getPageOffline).rejects.toBeInstanceOf(ApiUnreachableError);

    const pageOffline = repo.createPage(ADMIN_PAGE_FIXTURES.payload);
    httpMock.expectOne('/api/v1/pages').flush(null, ADMIN_ERROR_FIXTURES.offlineResponse);
    await expect(pageOffline).rejects.toBeInstanceOf(ApiUnreachableError);

    const urlOffline = repo.createUrl(ADMIN_URL_FIXTURES.createPayload);
    httpMock.expectOne('/api/v1/urls').flush(null, ADMIN_ERROR_FIXTURES.unavailableResponse);
    await expect(urlOffline).rejects.toBeInstanceOf(ApiUnreachableError);

    const mediaOffline = repo.uploadImage(ADMIN_MEDIA_FIXTURES.createImageFile());
    httpMock.expectOne('/api/v1/media').flush(null, ADMIN_ERROR_FIXTURES.offlineResponse);
    await expect(mediaOffline).rejects.toBeInstanceOf(ApiUnreachableError);
  });
});
