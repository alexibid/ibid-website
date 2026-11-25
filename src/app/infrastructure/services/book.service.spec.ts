import { TestBed } from '@angular/core/testing';
import { BOOK_NAVIGATION_FIXTURES } from '../../../mocks/book-navigation.mock';
import { BookService } from './book.service';

describe('BookService', () => {
  let bookService: BookService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    bookService = TestBed.inject(BookService);
  });

  afterEach(() => {
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('should reset the flip timer on consecutive triggerFlip calls so repeated clicks settle cleanly', () => {
    bookService.triggerFlip(1);
    expect(bookService.isFlipping()).toBe(true);
    expect(bookService.flipDirection()).toBe(1);

    vi.advanceTimersByTime(500);
    expect(bookService.isFlipping()).toBe(true);

    bookService.triggerFlip(-1);
    expect(bookService.isFlipping()).toBe(true);
    expect(bookService.flipDirection()).toBe(-1);

    vi.advanceTimersByTime(500);
    expect(bookService.isFlipping()).toBe(true);

    vi.advanceTimersByTime(400);
    expect(bookService.isFlipping()).toBe(false);
  });

  it('should compute continuous starting pages, chapter indices, and total pages excluding cover and exit routes', () => {
    bookService.setRouteOrder([...BOOK_NAVIGATION_FIXTURES.routes]);
    bookService.setPageCount('', 2);
    bookService.setPageCount('preface', 4);
    bookService.setPageCount('chapter-one', 6);
    bookService.setPageCount('exit', 2);

    expect(bookService.getChapterIndex('')).toBe(0);
    expect(bookService.getChapterIndex('preface')).toBe(1);
    expect(bookService.getChapterIndex('chapter-one')).toBe(2);
    expect(bookService.getChapterIndex('exit')).toBe(2);
    expect(bookService.getStartingPage('preface')).toBe(1);
    expect(bookService.getStartingPage('chapter-one')).toBe(5);
    expect(bookService.getChapterPages('preface')).toBe(4);
    expect(bookService.getTotalPages()).toBe(10);
  });
});
