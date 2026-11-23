import { TestBed } from '@angular/core/testing';
import type { CmsPage } from '../../domain/models/cms.interface';
import { PageType } from '../../domain/models/page-type.enum';
import { CONTENT_READ_REPOSITORY } from '../../infrastructure/tokens/content-repository.token';
import { BookFacade } from './book.facade';
import {
  createDeferred,
  createMockContentReadRepository,
  STATIC_HTML_FIXTURES,
  type ContentReadRepositoryMock
} from '../../../mocks/static-html.mock';

describe('BookFacade', () => {
  let facade: BookFacade;
  let mockRepo: ContentReadRepositoryMock;

  beforeEach(() => {
    mockRepo = createMockContentReadRepository();
    TestBed.configureTestingModule({
      providers: [
        BookFacade,
        { provide: CONTENT_READ_REPOSITORY, useValue: mockRepo }
      ]
    });
    facade = TestBed.inject(BookFacade);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should inject CONTENT_READ_REPOSITORY and load home sections for the requested language', async () => {
    await facade.loadHomeSections('pt');

    expect(mockRepo.loadSections).toHaveBeenCalledWith(PageType.Home, 'pt');
    expect(facade.sections()).toEqual(STATIC_HTML_FIXTURES.homeSections);
    expect(facade.isLoading()).toBe(false);
    expect(facade.error()).toBeNull();

    mockRepo.loadSections.mockResolvedValueOnce([]);
    await facade.loadHomeSections('xx');
    expect(facade.sections()).toEqual([]);
  });

  it('should load a chapter by pageId through CONTENT_READ_REPOSITORY and update currentChapter state', async () => {
    await facade.loadChapter(STATIC_HTML_FIXTURES.chapterPage.id);

    expect(mockRepo.getPage).toHaveBeenCalledWith(STATIC_HTML_FIXTURES.chapterPage.id);
    expect(facade.currentChapter()).toEqual(STATIC_HTML_FIXTURES.chapterPage);
    expect(facade.isLoading()).toBe(false);
    expect(facade.error()).toBeNull();
  });

  it('should ignore stale concurrent loadChapter responses when a newer request completes first', async () => {
    const firstDeferred = createDeferred<CmsPage>();
    const secondDeferred = createDeferred<CmsPage>();
    mockRepo.getPage
      .mockReturnValueOnce(firstDeferred.promise)
      .mockReturnValueOnce(secondDeferred.promise);

    const firstCall = facade.loadChapter(STATIC_HTML_FIXTURES.chapterPage.id);
    const secondCall = facade.loadChapter(STATIC_HTML_FIXTURES.secondaryChapterPage.id);

    secondDeferred.resolve(STATIC_HTML_FIXTURES.secondaryChapterPage);
    await secondCall;
    expect(facade.currentChapter()).toEqual(STATIC_HTML_FIXTURES.secondaryChapterPage);

    firstDeferred.resolve(STATIC_HTML_FIXTURES.chapterPage);
    await firstCall;
    expect(facade.currentChapter()).toEqual(STATIC_HTML_FIXTURES.secondaryChapterPage);
    expect(facade.isLoading()).toBe(false);
  });

  it('should ignore stale concurrent loadHomeSections responses when a newer request completes first', async () => {
    const firstDeferred = createDeferred<CmsPage[]>();
    const secondDeferred = createDeferred<CmsPage[]>();
    mockRepo.loadSections
      .mockReturnValueOnce(firstDeferred.promise)
      .mockReturnValueOnce(secondDeferred.promise);

    const firstCall = facade.loadHomeSections('pt');
    const secondCall = facade.loadHomeSections('en');

    secondDeferred.resolve([STATIC_HTML_FIXTURES.secondaryChapterPage]);
    await secondCall;
    expect(facade.sections()).toEqual([STATIC_HTML_FIXTURES.secondaryChapterPage]);

    firstDeferred.resolve(STATIC_HTML_FIXTURES.homeSections);
    await firstCall;
    expect(facade.sections()).toEqual([STATIC_HTML_FIXTURES.secondaryChapterPage]);
    expect(facade.isLoading()).toBe(false);
  });

  it('should handle repository errors cleanly in loadChapter and loadHomeSections without leaving isLoading true', async () => {
    mockRepo.getPage.mockRejectedValueOnce(new Error('Chapter unavailable'));
    await facade.loadChapter(STATIC_HTML_FIXTURES.missingPageId);
    expect(facade.isLoading()).toBe(false);
    expect(facade.error()).toBeTruthy();
    expect(facade.currentChapter()).toBeNull();

    mockRepo.loadSections.mockRejectedValueOnce(new Error('Sections unavailable'));
    await facade.loadHomeSections('pt');
    expect(facade.isLoading()).toBe(false);
    expect(facade.error()).toBeTruthy();
  });
});
