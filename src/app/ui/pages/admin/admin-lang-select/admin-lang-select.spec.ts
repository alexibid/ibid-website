import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminLangSelect } from './admin-lang-select';
import { ALL_SUPPORTED_LANGUAGE_CODES } from '../../../../../mocks/i18n.mock';

describe('AdminLangSelect', () => {
  let fixture: ComponentFixture<AdminLangSelect>;
  let component: AdminLangSelect;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLangSelect],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLangSelect);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should support de and fr in admin language selection with proper names and manage links', () => {
    for (const code of ALL_SUPPORTED_LANGUAGE_CODES) {
      expect(component.languages).toContain(code);
    }

    expect(component.getLangName('de')).toBe('German');
    expect(component.getLangName('fr')).toBe('French');

    const root = fixture.nativeElement;
    expect(root instanceof HTMLElement).toBe(true);
    if (root instanceof HTMLElement) {
      const text = root.textContent ?? '';
      expect(text).toContain('DE');
      expect(text).toContain('German');
      expect(text).toContain('FR');
      expect(text).toContain('French');

      const hrefs = Array.from(root.querySelectorAll('a.btn-manage')).map((link) => link.getAttribute('href'));
      expect(hrefs).toContain('/admin/de');
      expect(hrefs).toContain('/admin/fr');
    }
  });

  it('should handle unknown or empty language codes in getLangName without throwing', () => {
    expect(component.getLangName('xx').toUpperCase()).toBe('XX');
    expect(component.getLangName('')).toBe('');
  });
});
