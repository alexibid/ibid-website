import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { errorInterceptor } from '../../../infrastructure/interceptors/error.interceptor';
import {
  ANTI_SPAM_PRODUCTION,
  ANTI_SPAM_TOKEN_PORT,
  RECAPTCHA_SITE_KEY,
  createLazyRecaptchaAntiSpamPort
} from '../../../infrastructure/tokens/contact.tokens';
import { CONTENT_READ_REPOSITORY } from '../../../infrastructure/tokens/content-repository.token';
import {
  CONTACT_FORM_FIXTURES,
  STATIC_HTML_FIXTURES,
  createMockContentReadRepository
} from '../../../../mocks/static-html.mock';
import { ANTI_SPAM_FIXTURES } from '../../../../mocks/contact-form.mock';
import { expectStylesheetRules } from '../../../../mocks/css-rules.mock';
import { Chapter } from '../chapter/chapter';
import { Home } from '../home/home';
import { Exit } from './exit';

const EXIT_STYLESHEET = 'apps/ibid-website/src/app/ui/pages/exit/exit.scss';

function queryRecaptchaScripts(): HTMLScriptElement[] {
  return Array.from(
    document.head.querySelectorAll(`script[src^="${ANTI_SPAM_FIXTURES.scriptUrlPrefix}"]`)
  ).filter((node): node is HTMLScriptElement => node instanceof HTMLScriptElement);
}

describe('Exit lazy anti-spam loading across book routes', () => {
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home, Chapter, Exit],
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CONTENT_READ_REPOSITORY, useValue: createMockContentReadRepository() },
        { provide: RECAPTCHA_SITE_KEY, useValue: ANTI_SPAM_FIXTURES.siteKey },
        { provide: ANTI_SPAM_PRODUCTION, useValue: true },
        { provide: ANTI_SPAM_TOKEN_PORT, useFactory: createLazyRecaptchaAntiSpamPort }
      ]
    }).compileComponents();
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    for (const script of queryRecaptchaScripts()) {
      script.remove();
    }
    document.cookie = 'ibid-lang=; path=/; max-age=0';
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('should dynamically load the anti-spam verification script and adapter only when visiting the contact route and never on cover or chapter routes', async () => {
    const antiSpamPort = TestBed.inject(ANTI_SPAM_TOKEN_PORT);
    const initSpy = vi.spyOn(antiSpamPort, 'init');

    const homeFixture = TestBed.createComponent(Home);
    Object.defineProperty(homeFixture.nativeElement, 'scrollTo', { value: vi.fn(), configurable: true });
    homeFixture.detectChanges();
    await homeFixture.whenStable();
    homeFixture.detectChanges();
    expect(initSpy).not.toHaveBeenCalled();
    expect(queryRecaptchaScripts()).toHaveLength(0);
    homeFixture.destroy();

    const chapterFixture = TestBed.createComponent(Chapter);
    Object.defineProperty(chapterFixture.nativeElement, 'scrollTo', { value: vi.fn(), configurable: true });
    chapterFixture.componentRef.setInput('pageId', STATIC_HTML_FIXTURES.inlineChapterInput.pageId);
    chapterFixture.componentRef.setInput('title', STATIC_HTML_FIXTURES.inlineChapterInput.title);
    chapterFixture.componentRef.setInput('lang', STATIC_HTML_FIXTURES.inlineChapterInput.lang);
    chapterFixture.componentRef.setInput('type', STATIC_HTML_FIXTURES.inlineChapterInput.type);
    chapterFixture.componentRef.setInput('content', STATIC_HTML_FIXTURES.inlineChapterInput.content);
    chapterFixture.detectChanges();
    await chapterFixture.whenStable();
    chapterFixture.detectChanges();
    expect(initSpy).not.toHaveBeenCalled();
    expect(queryRecaptchaScripts()).toHaveLength(0);
    chapterFixture.destroy();

    const exitFixture = TestBed.createComponent(Exit);
    Object.defineProperty(exitFixture.nativeElement, 'scrollTo', { value: vi.fn(), configurable: true });
    exitFixture.componentRef.setInput('lang', CONTACT_FORM_FIXTURES.exitLang);
    exitFixture.detectChanges();
    await exitFixture.whenStable();
    exitFixture.detectChanges();

    expect(initSpy).toHaveBeenCalledTimes(1);
    const scripts = queryRecaptchaScripts();
    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe(
      `${ANTI_SPAM_FIXTURES.scriptUrlPrefix}?render=${encodeURIComponent(ANTI_SPAM_FIXTURES.siteKey)}`
    );
    exitFixture.destroy();
  });

  it('should render a visually hidden honeypot input off-screen with tabindex -1, aria-hidden true, and autocomplete off', async () => {
    const fixture = TestBed.createComponent(Exit);
    const root: unknown = fixture.nativeElement;
    if (!(root instanceof HTMLElement)) throw new Error('Exit nativeElement is not an HTMLElement');
    Object.defineProperty(root, 'scrollTo', { value: vi.fn(), configurable: true });
    fixture.componentRef.setInput('lang', CONTACT_FORM_FIXTURES.exitLang);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const honeypot = root.querySelector('input[name="honeypot"]');
    if (!(honeypot instanceof HTMLInputElement)) throw new Error('Honeypot input not found');
    expect(honeypot.type).toBe('text');
    expect(honeypot.classList.contains('contact-honeypot')).toBe(true);
    expect(honeypot.getAttribute('tabindex')).toBe('-1');
    expect(honeypot.tabIndex).toBe(-1);
    expect(honeypot.getAttribute('aria-hidden')).toBe('true');
    expect(honeypot.getAttribute('autocomplete')).toBe('off');
    expect(honeypot.labels?.length ?? 0).toBe(0);
    expectStylesheetRules(EXIT_STYLESHEET, [
      [/^\.contact-honeypot$/, /position:\s*absolute/],
      [/^\.contact-honeypot$/, /inset:\s*0(px)? auto auto -9999px/]
    ]);
    fixture.destroy();
  });
});
