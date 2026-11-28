import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CONTENT_READ_REPOSITORY } from '../../../infrastructure/tokens/content-repository.token';
import { I18nService } from '../../../infrastructure/services/i18n.service';
import { BookNavigationDirective } from '../../directives/book-navigation.directive';
import { createMockContentReadRepository } from '../../../../mocks/static-html.mock';
import { Home } from './home';

function queryBackLink(fixture: ComponentFixture<Home>): HTMLAnchorElement {
  const host: unknown = fixture.nativeElement;
  const link = host instanceof HTMLElement ? host.querySelector('.page-subheader') : null;
  if (!(link instanceof HTMLAnchorElement)) throw new Error('Back link not rendered');
  return link;
}

describe('Home', () => {
  let fixture: ComponentFixture<Home>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        { provide: CONTENT_READ_REPOSITORY, useValue: createMockContentReadRepository() }
      ]
    }).compileComponents();

    TestBed.inject(I18nService).setLanguage('pt');
    fixture = TestBed.createComponent(Home);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should render the index back link as a crawlable link to the language cover', () => {
    expect(queryBackLink(fixture).getAttribute('href')).toBe('/pt');
  });

  it('should turn the page back on a plain click instead of following the link', () => {
    const nav = fixture.debugElement.injector.get(BookNavigationDirective);
    const turnPage = vi.spyOn(nav, 'handleNavigation').mockImplementation(() => undefined);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });

    queryBackLink(fixture).dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(turnPage).toHaveBeenCalledWith(-1);
  });

  it('should let modified clicks open the link natively', () => {
    const nav = fixture.debugElement.injector.get(BookNavigationDirective);
    const turnPage = vi.spyOn(nav, 'handleNavigation').mockImplementation(() => undefined);
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, metaKey: true });
    queryBackLink(fixture).addEventListener('click', (event) => event.preventDefault());

    queryBackLink(fixture).dispatchEvent(click);

    expect(turnPage).not.toHaveBeenCalled();
  });
});
