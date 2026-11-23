import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../../../infrastructure/services/i18n.service';
import { ErrorType, UiErrorService } from '../../../../infrastructure/services/ui-error.service';
import { GlobalAlertComponent } from './global-alert';

describe('GlobalAlertComponent', () => {
  let fixture: ComponentFixture<GlobalAlertComponent>;
  let i18n: I18nService;
  let uiError: UiErrorService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalAlertComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'browser' }]
    }).compileComponents();

    i18n = TestBed.inject(I18nService);
    uiError = TestBed.inject(UiErrorService);
    fixture = TestBed.createComponent(GlobalAlertComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    document.cookie = 'ibid-lang=; path=/; max-age=0';
    TestBed.resetTestingModule();
  });

  function readDialog(): { title: string; message: string; closeLabel: string } | null {
    const root = fixture.nativeElement;
    if (!(root instanceof HTMLElement)) {
      return null;
    }
    const dialog = root.querySelector('.global-alert-dialog');
    if (!dialog) {
      return null;
    }
    return {
      title: dialog.querySelector('h2')?.textContent?.trim() ?? '',
      message: dialog.querySelector('p')?.textContent?.trim() ?? '',
      closeLabel: dialog.querySelector('button')?.textContent?.trim() ?? ''
    };
  }

  it('should display localized network, server, and generic error alerts in de and fr without English fallback', () => {
    const errorTypes: Exclude<ErrorType, null>[] = ['error-network', 'error-server', 'error-generic', 'not-found'];

    for (const errorType of errorTypes) {
      i18n.setLanguage('en');
      uiError.showError(errorType);
      fixture.detectChanges();
      const enDialog = readDialog();

      i18n.setLanguage('de');
      fixture.detectChanges();
      expect(i18n.currentLangCode()).toBe('de');
      const deDialog = readDialog();
      expect(deDialog).not.toBeNull();
      expect(deDialog?.title).not.toBe('');
      expect(deDialog?.message).not.toBe('');
      expect(deDialog?.message).not.toBe(enDialog?.message);
      expect(deDialog?.closeLabel).not.toBe('');
      expect(deDialog?.closeLabel).not.toBe(enDialog?.closeLabel);

      i18n.setLanguage('fr');
      fixture.detectChanges();
      expect(i18n.currentLangCode()).toBe('fr');
      const frDialog = readDialog();
      expect(frDialog).not.toBeNull();
      expect(frDialog?.closeLabel).toBe('Fermer');
      expect(frDialog?.message).not.toBe(enDialog?.message);
    }
  });

  it('should render nothing when error state is null or dismissed', () => {
    expect(readDialog()).toBeNull();

    i18n.setLanguage('fr');
    uiError.showError('error-generic');
    fixture.detectChanges();
    expect(readDialog()).not.toBeNull();

    const button = fixture.nativeElement instanceof HTMLElement
      ? fixture.nativeElement.querySelector('button')
      : null;
    button?.click();
    fixture.detectChanges();
    expect(readDialog()).toBeNull();
  });
});
