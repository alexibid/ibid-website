import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookFacade } from '../../../application/facades/book.facade';
import { CONTENT_READ_REPOSITORY } from '../../../infrastructure/tokens/content-repository.token';
import {
  createMockContentReadRepository,
  STATIC_HTML_FIXTURES,
  type ContentReadRepositoryMock
} from '../../../../mocks/static-html.mock';
import { Chapter } from './chapter';

function setChapterInputs(
  fixture: ComponentFixture<Chapter>,
  inputs: typeof STATIC_HTML_FIXTURES.inlineChapterInput
): void {
  fixture.componentRef.setInput('pageId', inputs.pageId);
  fixture.componentRef.setInput('title', inputs.title);
  fixture.componentRef.setInput('lang', inputs.lang);
  fixture.componentRef.setInput('type', inputs.type);
  fixture.componentRef.setInput('content', inputs.content);
  fixture.componentRef.setInput('metadata', inputs.metadata);
  fixture.componentRef.setInput('location', inputs.location);
}

describe('Chapter', () => {
  let fixture: ComponentFixture<Chapter>;
  let bookFacade: BookFacade;
  let mockRepo: ContentReadRepositoryMock;

  beforeEach(async () => {
    mockRepo = createMockContentReadRepository();
    await TestBed.configureTestingModule({
      imports: [Chapter],
      providers: [
        provideRouter([]),
        { provide: CONTENT_READ_REPOSITORY, useValue: mockRepo }
      ]
    }).compileComponents();

    bookFacade = TestBed.inject(BookFacade);
    fixture = TestBed.createComponent(Chapter);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should trigger bookFacade.loadChapter(pageId) when route data has empty content and render loaded content', async () => {
    const loadChapterSpy = vi.spyOn(bookFacade, 'loadChapter');
    setChapterInputs(fixture, STATIC_HTML_FIXTURES.emptyContentChapterInput);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(loadChapterSpy).toHaveBeenCalledWith(STATIC_HTML_FIXTURES.emptyContentChapterInput.pageId);
    expect(mockRepo.getPage).toHaveBeenCalledWith(STATIC_HTML_FIXTURES.emptyContentChapterInput.pageId);

    const host = fixture.nativeElement;
    expect(host instanceof HTMLElement).toBe(true);
    if (host instanceof HTMLElement) {
      expect(host.querySelector('.page-title')?.textContent?.trim()).toBe(STATIC_HTML_FIXTURES.chapterPage.title);
      expect(host.querySelector('.page-body')?.innerHTML).toContain(STATIC_HTML_FIXTURES.chapterPage.content);
    }
  });

  it('should render inline content directly without calling bookFacade.loadChapter when content is non-empty', async () => {
    const loadChapterSpy = vi.spyOn(bookFacade, 'loadChapter');
    setChapterInputs(fixture, STATIC_HTML_FIXTURES.inlineChapterInput);

    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(loadChapterSpy).not.toHaveBeenCalled();
    expect(mockRepo.getPage).not.toHaveBeenCalled();

    const host = fixture.nativeElement;
    expect(host instanceof HTMLElement).toBe(true);
    if (host instanceof HTMLElement) {
      expect(host.querySelector('.page-title')?.textContent?.trim()).toBe(STATIC_HTML_FIXTURES.inlineChapterInput.title);
      expect(host.querySelector('.page-body')?.innerHTML).toContain(STATIC_HTML_FIXTURES.inlineChapterInput.content);
    }
  });

  it('should handle missing pageId or loadChapter errors gracefully without leaving loading state stuck', async () => {
    const loadChapterSpy = vi.spyOn(bookFacade, 'loadChapter');
    setChapterInputs(fixture, { ...STATIC_HTML_FIXTURES.emptyContentChapterInput, pageId: '' });

    fixture.detectChanges();
    await fixture.whenStable();
    expect(loadChapterSpy).not.toHaveBeenCalled();

    mockRepo.getPage.mockRejectedValueOnce(new Error('Fetch failure'));
    setChapterInputs(fixture, STATIC_HTML_FIXTURES.emptyContentChapterInput);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(loadChapterSpy).toHaveBeenCalledWith(STATIC_HTML_FIXTURES.emptyContentChapterInput.pageId);
    const host = fixture.nativeElement;
    if (host instanceof HTMLElement) {
      expect(host.querySelector('.loading-state')).toBeNull();
    }
  });
});
