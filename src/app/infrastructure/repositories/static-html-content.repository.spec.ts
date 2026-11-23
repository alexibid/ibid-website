import { PLATFORM_ID, TransferState } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PageType } from '../../domain/models/page-type.enum';
import { STATIC_HTML_FIXTURES } from '../../../mocks/static-html.mock';
import { StaticHtmlContentRepository } from './static-html-content.repository';

describe('StaticHtmlContentRepository', () => {
  let repo: StaticHtmlContentRepository;
  let httpMock: HttpTestingController;
  let transferState: TransferState;

  function setupRepository(platformId: 'browser' | 'server' = 'browser'): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: platformId },
        provideHttpClient(),
        provideHttpClientTesting(),
        StaticHtmlContentRepository
      ]
    });
    repo = TestBed.inject(StaticHtmlContentRepository);
    httpMock = TestBed.inject(HttpTestingController);
    transferState = TestBed.inject(TransferState);
  }

  beforeEach(() => {
    setupRepository('browser');
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('should fetch /pages/routes.json via HttpClient on TransferState miss and map urls', async () => {
    const urlsPromise = repo.getUrls();
    const req = httpMock.expectOne(STATIC_HTML_FIXTURES.routesJsonUrl);
    expect(req.request.method).toBe('GET');
    req.flush(STATIC_HTML_FIXTURES.manifest);

    const urls = await urlsPromise;
    expect(urls).toHaveLength(STATIC_HTML_FIXTURES.manifest.urls.length);
    expect(urls[1].page_id).toBe(STATIC_HTML_FIXTURES.chapterPage.id);
    expect(urls[1].expand?.page_id?.title).toBe(STATIC_HTML_FIXTURES.chapterPage.title);
    expect(urls[1].expand?.page_id?.content).toBe('');

    setupRepository('browser');
    const emptyPromise = repo.getUrls();
    httpMock.expectOne(STATIC_HTML_FIXTURES.routesJsonUrl).flush(STATIC_HTML_FIXTURES.emptyManifest);
    expect(await emptyPromise).toEqual([]);
  });

  it('should fetch /pages/<lang>/<pageId>.html as text on TransferState miss and return CmsPage', async () => {
    const pagePromise = repo.getPage(STATIC_HTML_FIXTURES.chapterPage.id);
    const routesReq = httpMock.expectOne(STATIC_HTML_FIXTURES.routesJsonUrl);
    expect(routesReq.request.method).toBe('GET');
    routesReq.flush(STATIC_HTML_FIXTURES.manifest);

    await Promise.resolve();
    await Promise.resolve();

    const htmlReq = httpMock.expectOne(STATIC_HTML_FIXTURES.chapterHtmlUrl);
    expect(htmlReq.request.method).toBe('GET');
    expect(htmlReq.request.responseType).toBe('text');
    htmlReq.flush(STATIC_HTML_FIXTURES.chapterPage.content);

    const page = await pagePromise;
    expect(page.id).toBe(STATIC_HTML_FIXTURES.chapterPage.id);
    expect(page.title).toBe(STATIC_HTML_FIXTURES.chapterPage.title);
    expect(page.type).toBe(STATIC_HTML_FIXTURES.chapterPage.type);
    expect(page.lang).toBe(STATIC_HTML_FIXTURES.chapterPage.lang);
    expect(page.content).toBe(STATIC_HTML_FIXTURES.chapterPage.content);
  });

  it('should write routes and page HTML to TransferState on server miss and reuse on browser hit without HTTP requests', async () => {
    setupRepository('server');
    const setSpy = vi.spyOn(transferState, 'set');

    const serverPagePromise = repo.getPage(STATIC_HTML_FIXTURES.chapterPage.id);
    httpMock.expectOne(STATIC_HTML_FIXTURES.routesJsonUrl).flush(STATIC_HTML_FIXTURES.manifest);
    await Promise.resolve();
    await Promise.resolve();
    httpMock.expectOne(STATIC_HTML_FIXTURES.chapterHtmlUrl).flush(STATIC_HTML_FIXTURES.chapterPage.content);
    await serverPagePromise;

    expect(setSpy).toHaveBeenCalled();
    const capturedEntries = setSpy.mock.calls.map(([key, value]) => ({ key, value }));
    httpMock.verify();

    setupRepository('browser');
    for (const entry of capturedEntries) {
      transferState.set(entry.key, entry.value);
    }

    const cachedPage = await repo.getPage(STATIC_HTML_FIXTURES.chapterPage.id);
    httpMock.expectNone(STATIC_HTML_FIXTURES.routesJsonUrl);
    httpMock.expectNone(STATIC_HTML_FIXTURES.chapterHtmlUrl);
    expect(cachedPage.id).toBe(STATIC_HTML_FIXTURES.chapterPage.id);
    expect(cachedPage.content).toBe(STATIC_HTML_FIXTURES.chapterPage.content);
  });

  it('should load sections for type and language from routes.json and /pages/<lang>/<pageId>.html', async () => {
    const sectionsPromise = repo.loadSections(PageType.Home, 'pt');
    httpMock.expectOne(STATIC_HTML_FIXTURES.routesJsonUrl).flush(STATIC_HTML_FIXTURES.manifest);

    await Promise.resolve();
    await Promise.resolve();

    const coverReq = httpMock.expectOne(STATIC_HTML_FIXTURES.homeCoverHtmlUrl);
    expect(coverReq.request.responseType).toBe('text');
    coverReq.flush(STATIC_HTML_FIXTURES.homeSections[0].content);

    const indexReq = httpMock.expectOne(STATIC_HTML_FIXTURES.homeIndexHtmlUrl);
    expect(indexReq.request.responseType).toBe('text');
    indexReq.flush(STATIC_HTML_FIXTURES.homeSections[1].content);

    const sections = await sectionsPromise;
    expect(sections).toHaveLength(STATIC_HTML_FIXTURES.homeSections.length);
    expect(sections[0].content).toBe(STATIC_HTML_FIXTURES.homeSections[0].content);
    expect(sections[1].content).toBe(STATIC_HTML_FIXTURES.homeSections[1].content);

    const ptChapters = await repo.getPages({ type: PageType.Chapter, lang: 'pt' });
    expect(ptChapters).toHaveLength(1);
    expect(ptChapters[0].id).toBe(STATIC_HTML_FIXTURES.chapterPage.id);

    const unknownSections = await repo.loadSections(PageType.Home, 'xx');
    expect(unknownSections).toEqual([]);
  });

  it('should reject path traversal or invalid segment characters matching /^[a-zA-Z0-9._-]+$/', async () => {
    for (const invalidId of STATIC_HTML_FIXTURES.invalidPathIds) {
      await expect(repo.getPage(invalidId)).rejects.toThrow();
    }

    setupRepository('browser');
    const badLangPromise = repo.getPage(STATIC_HTML_FIXTURES.traversalPageId);
    httpMock.expectOne(STATIC_HTML_FIXTURES.routesJsonUrl).flush(STATIC_HTML_FIXTURES.traversalManifest);
    await expect(badLangPromise).rejects.toThrow();
  });

  it('should throw an error when requested pageId is missing from routes.json', async () => {
    const missingPromise = repo.getPage(STATIC_HTML_FIXTURES.missingPageId);
    httpMock.expectOne(STATIC_HTML_FIXTURES.routesJsonUrl).flush(STATIC_HTML_FIXTURES.manifest);
    await expect(missingPromise).rejects.toThrow();
  });

  it('should propagate HTTP errors when routes.json or page HTML request fails', async () => {
    const routesFail = repo.getUrls();
    httpMock.expectOne(STATIC_HTML_FIXTURES.routesJsonUrl).flush(null, STATIC_HTML_FIXTURES.httpError500);
    await expect(routesFail).rejects.toBeDefined();

    setupRepository('browser');
    const htmlFail = repo.getPage(STATIC_HTML_FIXTURES.chapterPage.id);
    httpMock.expectOne(STATIC_HTML_FIXTURES.routesJsonUrl).flush(STATIC_HTML_FIXTURES.manifest);
    await Promise.resolve();
    await Promise.resolve();
    httpMock.expectOne(STATIC_HTML_FIXTURES.chapterHtmlUrl).flush(null, STATIC_HTML_FIXTURES.httpError404);
    await expect(htmlFail).rejects.toBeDefined();
  });
});
