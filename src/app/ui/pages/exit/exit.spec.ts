import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PLATFORM_ID, inject } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContactFacade } from '../../../application/facades/contact.facade';
import { StateService } from '../../../application/state/state.service';
import { CONTACT_I18N } from '../../../domain/constants/contact-i18n';
import { SUPPORTED_LANGUAGE_CODES } from '../../../domain/constants/languages';
import { PageType } from '../../../domain/models/page-type.enum';
import { BookService } from '../../../infrastructure/services/book.service';
import { I18nService } from '../../../infrastructure/services/i18n.service';
import { CONTENT_READ_REPOSITORY } from '../../../infrastructure/tokens/content-repository.token';
import { BookNavigationDirective } from '../../directives/book-navigation.directive';
import { createMockContactFacade, type MockContactFacade } from '../../../../mocks/contact-facade.mock';
import { CONTACT_VALIDATION_FIXTURES } from '../../../../mocks/contact-form.mock';
import { CONTACT_FORM_FIXTURES, STATIC_HTML_FIXTURES, createMockContentReadRepository } from '../../../../mocks/static-html.mock';
import { Exit } from './exit';

function requireHost(fixture: ComponentFixture<Exit>): HTMLElement {
  const root: unknown = fixture.nativeElement;
  if (!(root instanceof HTMLElement)) throw new Error('Exit nativeElement is not an HTMLElement');
  return root;
}

function queryEl<T extends Element>(root: HTMLElement, selector: string, ctor: abstract new () => T): T {
  const element = root.querySelector(selector);
  if (!(element instanceof ctor)) throw new Error(`Element not found: ${selector}`);
  return element;
}

const queryInput = (root: HTMLElement, selector: string): HTMLInputElement =>
  queryEl(root, selector, HTMLInputElement);
const queryTextArea = (root: HTMLElement, selector: string): HTMLTextAreaElement =>
  queryEl(root, selector, HTMLTextAreaElement);
const queryButton = (root: HTMLElement, selector: string): HTMLButtonElement =>
  queryEl(root, selector, HTMLButtonElement);
const queryLabel = (root: HTMLElement, forId: string): HTMLLabelElement =>
  queryEl(root, `label[for="${forId}"]`, HTMLLabelElement);
const textOf = (root: HTMLElement, selector: string): string =>
  root.querySelector(selector)?.textContent?.trim() ?? '';

function dispatchFieldInput(field: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true }));
}

function fillValidForm(root: HTMLElement): void {
  dispatchFieldInput(queryInput(root, '#name'), CONTACT_FORM_FIXTURES.validName);
  dispatchFieldInput(queryInput(root, '#email'), CONTACT_FORM_FIXTURES.validEmail);
  dispatchFieldInput(queryTextArea(root, '#message'), CONTACT_FORM_FIXTURES.validMessage);
}

describe('Exit', () => {
  let fixture: ComponentFixture<Exit>;
  let facade: MockContactFacade;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Exit],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: PLATFORM_ID, useValue: 'browser' },
        { provide: CONTENT_READ_REPOSITORY, useValue: createMockContentReadRepository() },
        { provide: ContactFacade, useFactory: () => (facade = createMockContactFacade(inject(I18nService))) }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Exit);
    Object.defineProperty(requireHost(fixture), 'scrollTo', { value: vi.fn(), configurable: true });
    fixture.componentRef.setInput('lang', CONTACT_FORM_FIXTURES.exitLang);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    httpMock.verify();
    document.cookie = 'ibid-lang=; path=/; max-age=0';
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('should render native text input, email input, and textarea with matching labels, autocomplete, and required attributes', () => {
    const root = requireHost(fixture);
    expect(root.querySelector('.contact-form [contenteditable], .contact-form [role="textbox"]')).toBeNull();
    const [nameInput, emailInput, messageInput] = [
      queryInput(root, '#name'), queryInput(root, '#email'), queryTextArea(root, '#message')
    ];
    const [nameLabel, emailLabel, messageLabel] = [
      queryLabel(root, 'name'), queryLabel(root, 'email'), queryLabel(root, 'message')
    ];

    expect(nameInput.type).toBe('text');
    expect(nameInput.getAttribute('autocomplete')).toBe('name');
    expect(nameInput.required).toBe(true);
    expect(nameLabel.textContent?.trim()).not.toBe('');
    expect(Array.from(nameInput.labels ?? [])).toContain(nameLabel);
    expect(emailInput.type).toBe('email');
    expect(emailInput.getAttribute('autocomplete')).toBe('email');
    expect(emailInput.required).toBe(true);
    expect(emailLabel.textContent?.trim()).not.toBe('');
    expect(Array.from(emailInput.labels ?? [])).toContain(emailLabel);
    expect(messageInput.getAttribute('autocomplete')).toBe('off');
    expect(messageInput.required).toBe(true);
    expect(messageLabel.textContent?.trim()).not.toBe('');
    expect(Array.from(messageInput.labels ?? [])).toContain(messageLabel);

    fillValidForm(root);
    fixture.detectChanges();
    expect(facade.name()).toBe(CONTACT_FORM_FIXTURES.validName);
    expect(facade.email()).toBe(CONTACT_FORM_FIXTURES.validEmail);
    expect(facade.message()).toBe(CONTACT_FORM_FIXTURES.validMessage);
  });

  it('should move keyboard focus to the first invalid field when trying to submit an invalid form', async () => {
    const root = requireHost(fixture);
    Object.defineProperty(root, 'clientWidth', { value: CONTACT_FORM_FIXTURES.viewportWidth, configurable: true });
    const [nameInput, emailInput, messageInput] = [
      queryInput(root, '#name'), queryInput(root, '#email'), queryTextArea(root, '#message')
    ];
    const submitButton = queryButton(root, '.contact-form button[type="submit"]');
    const submitAndExpectFocus = async (expected: HTMLElement): Promise<void> => {
      submitButton.click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(document.activeElement).toBe(expected);
    };

    await submitAndExpectFocus(nameInput);
    dispatchFieldInput(nameInput, CONTACT_FORM_FIXTURES.validName);
    dispatchFieldInput(emailInput, CONTACT_FORM_FIXTURES.invalidEmail);
    dispatchFieldInput(messageInput, CONTACT_VALIDATION_FIXTURES.messageBoundaries.tooShort);
    await submitAndExpectFocus(emailInput);
    dispatchFieldInput(emailInput, CONTACT_FORM_FIXTURES.validEmail);
    await submitAndExpectFocus(messageInput);
    expect(facade.submitStatus()).toBe('idle');
  });

  it('should set aria-invalid="true" and connect each invalid field to its error text with aria-describedby on blur and submit', async () => {
    const root = requireHost(fixture);
    const [nameInput, emailInput, messageInput] = [
      queryInput(root, '#name'), queryInput(root, '#email'), queryTextArea(root, '#message')
    ];
    const submitButton = queryButton(root, '.contact-form button[type="submit"]');
    const { errorIds, localizedErrorsPt, formCases } = CONTACT_VALIDATION_FIXTURES;
    const expectValidState = (control: HTMLElement, errorId: string): void => {
      expect(control.getAttribute('aria-invalid')).toBeNull();
      expect(control.getAttribute('aria-describedby')).toBeNull();
      expect(root.querySelector(`#${errorId}`)).toBeNull();
    };
    const expectInvalidState = (control: HTMLElement, errorId: string, text: string): void => {
      expect(control.getAttribute('aria-invalid')).toBe('true');
      expect(control.getAttribute('aria-describedby')).toBe(errorId);
      expect(root.querySelector(`#${errorId}`)?.textContent?.trim()).toBe(text);
    };

    dispatchFieldInput(emailInput, CONTACT_FORM_FIXTURES.invalidEmail);
    fixture.detectChanges();
    expectValidState(nameInput, errorIds.name);
    expectValidState(emailInput, errorIds.email);
    expectValidState(messageInput, errorIds.message);
    emailInput.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expectInvalidState(emailInput, errorIds.email, localizedErrorsPt.emailInvalid);
    dispatchFieldInput(emailInput, CONTACT_FORM_FIXTURES.validEmail);
    fixture.detectChanges();
    expectValidState(emailInput, errorIds.email);
    dispatchFieldInput(nameInput, formCases.allInvalid.name);
    dispatchFieldInput(emailInput, formCases.allInvalid.email);
    dispatchFieldInput(messageInput, formCases.allInvalid.message);
    submitButton.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expectInvalidState(nameInput, errorIds.name, localizedErrorsPt.nameRequired);
    expectInvalidState(emailInput, errorIds.email, localizedErrorsPt.emailTooShort);
    expectInvalidState(messageInput, errorIds.message, localizedErrorsPt.messageTooShort);
  });

  it('should switch labels, placeholders, active errors, and privacy notice for every supported language', async () => {
    const root = requireHost(fixture);
    queryButton(root, '.contact-form button[type="submit"]').click();

    for (const lang of SUPPORTED_LANGUAGE_CODES) {
      fixture.componentRef.setInput('lang', lang);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      const copy = CONTACT_I18N[lang];

      expect(textOf(root, 'label[for="name"]')).toBe(copy.name);
      expect(textOf(root, 'label[for="email"]')).toBe(copy.email);
      expect(textOf(root, 'label[for="message"]')).toBe(copy.message);
      expect(queryInput(root, '#name').placeholder).toBe(copy['name-placeholder']);
      expect(queryInput(root, '#email').placeholder).toBe(copy['email-placeholder']);
      expect(queryTextArea(root, '#message').placeholder).toBe(copy['message-placeholder']);
      expect(textOf(root, `#${CONTACT_VALIDATION_FIXTURES.errorIds.name}`)).toBe(copy.errors.name.required);
      expect(textOf(root, `#${CONTACT_VALIDATION_FIXTURES.errorIds.email}`)).toBe(copy.errors.email.required);
      expect(textOf(root, `#${CONTACT_VALIDATION_FIXTURES.errorIds.message}`)).toBe(copy.errors.message.required);
      expect(textOf(root, '.submit-btn')).toBe(copy.submit);
      expect(textOf(root, '.contact-privacy')).toBe(copy['privacy-notice']);
    }
  });

  it('should show sending, failure with typed text kept, and confirmation states from the facade', async () => {
    const root = requireHost(fixture);
    const copy = CONTACT_I18N.pt;
    const submitButton = queryButton(root, '.contact-form button[type="submit"]');
    let settle: (accepted: boolean) => void = () => undefined;
    facade.setSubmitHandler(() => new Promise<boolean>((resolve) => (settle = resolve)));
    const settleAndRender = async (accepted: boolean): Promise<void> => {
      settle(accepted);
      await fixture.whenStable();
      fixture.detectChanges();
    };

    fillValidForm(root);
    submitButton.click();
    fixture.detectChanges();
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.getAttribute('aria-busy')).toBe('true');
    expect(submitButton.textContent?.trim()).toBe(copy.submitting);

    await settleAndRender(false);
    expect(textOf(root, '[role="alert"] .form-error-global__message')).toBe(copy['submission-errors'].server);
    expect(queryInput(root, '#name').value).toBe(CONTACT_FORM_FIXTURES.validName);
    expect(queryInput(root, '#email').value).toBe(CONTACT_FORM_FIXTURES.validEmail);
    expect(queryTextArea(root, '#message').value).toBe(CONTACT_FORM_FIXTURES.validMessage);
    expect(submitButton.disabled).toBe(false);

    queryButton(root, '.form-error-global__retry').click();
    fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')).toBeNull();

    await settleAndRender(true);
    expect(textOf(root, '.form-confirmation__title')).toBe(copy['success-title']);
    expect(textOf(root, '[aria-live="polite"]')).toBe(`${copy['success-title']}. ${copy['success-message']}`);
    expect(document.activeElement).toBe(root.querySelector('.form-confirmation'));
  });

  it('should isolate editing in #name, #email, and #message from book navigation when pressing Space, Arrow keys, Backspace, or Enter', () => {
    const root = requireHost(fixture);
    const [bookService, stateService] = [TestBed.inject(BookService), TestBed.inject(StateService)];
    const bookNav = fixture.debugElement.injector.get(BookNavigationDirective);
    const [midScrollLeft, endScrollLeft] = [CONTACT_FORM_FIXTURES.viewportWidth, CONTACT_FORM_FIXTURES.scrollWidth - CONTACT_FORM_FIXTURES.viewportWidth];
    let scrollLeftValue = midScrollLeft;
    const scrollBySpy = vi.fn((options?: ScrollToOptions) => { scrollLeftValue += options?.left ?? 0; });
    const scrollToSpy = vi.fn((options?: ScrollToOptions) => { scrollLeftValue = options?.left ?? 0; });
    Object.defineProperties(root, {
      clientWidth: { value: midScrollLeft, configurable: true }, scrollWidth: { value: CONTACT_FORM_FIXTURES.scrollWidth, configurable: true },
      scrollBy: { value: scrollBySpy, configurable: true }, scrollTo: { value: scrollToSpy, configurable: true },
      scrollLeft: { get: () => scrollLeftValue, set: (value: number) => { scrollLeftValue = value; }, configurable: true }
    });
    bookService.activePageType.set(PageType.Exit);
    bookService.currentChapterPage.set(1);
    stateService.prevLink.set('/' + STATIC_HTML_FIXTURES.urls[1].url);
    stateService.nextLink.set('/' + STATIC_HTML_FIXTURES.urls[3].url);
    const [handleNavSpy, triggerFlipSpy, navigateSpy] = [vi.spyOn(bookNav, 'handleNavigation'), vi.spyOn(bookService, 'triggerFlip'), vi.spyOn(stateService, 'navigateWithFlip')];
    const fieldCases: readonly [HTMLInputElement | HTMLTextAreaElement, string][] = [
      [queryInput(root, '#name'), CONTACT_FORM_FIXTURES.editedName], [queryInput(root, '#email'), CONTACT_FORM_FIXTURES.editedEmail], [queryTextArea(root, '#message'), CONTACT_FORM_FIXTURES.editedMessage]
    ];
    for (const [field, editedValue] of fieldCases) {
      field.focus();
      expect(document.activeElement).toBe(field);
      for (const scrollLeft of [midScrollLeft, 0, endScrollLeft]) {
        root.scrollLeft = scrollLeft;
        for (const key of CONTACT_FORM_FIXTURES.editingKeys) {
          const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
          field.dispatchEvent(event);
          expect(event.defaultPrevented).toBe(false);
        }
        expect(root.scrollLeft).toBe(scrollLeft);
      }
      dispatchFieldInput(field, editedValue);
      fixture.detectChanges();
      expect(field.value).toBe(editedValue);
    }
    expect([facade.name(), facade.email(), facade.message()]).toEqual([CONTACT_FORM_FIXTURES.editedName, CONTACT_FORM_FIXTURES.editedEmail, CONTACT_FORM_FIXTURES.editedMessage]);
    for (const spy of [handleNavSpy, triggerFlipSpy, navigateSpy, scrollBySpy, scrollToSpy]) expect(spy).not.toHaveBeenCalled();
    queryInput(root, '#name').blur();
    document.body.focus();
    root.scrollLeft = midScrollLeft;
    const outsideSpace = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    document.body.dispatchEvent(outsideSpace);
    expect(outsideSpace.defaultPrevented).toBe(true);
    expect(handleNavSpy).toHaveBeenCalledWith(1);
    expect(triggerFlipSpy).toHaveBeenCalledWith(1);
    expect(scrollBySpy).toHaveBeenCalledWith({ left: midScrollLeft, behavior: 'instant' });
  });
});
