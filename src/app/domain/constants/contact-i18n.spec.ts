import {
  CONTACT_FIELD_ERROR_KEYS,
  CONTACT_I18N,
  CONTACT_SUBMISSION_ERROR_KEYS
} from './contact-i18n';
import { SUPPORTED_LANGUAGE_CODES } from './languages';
import { UI_I18N } from './ui-i18n';
import { CONTACT_I18N_FIXTURES } from '../../../mocks/contact-form.mock';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function resolveTranslationPath(root: unknown, path: string): unknown {
  let current: unknown = root;
  for (const segment of path.split('.')) {
    if (!isRecord(current) || !(segment in current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

describe('CONTACT_I18N', () => {
  it('should provide complete non-empty contact labels, validation errors, and status copy across all five languages', () => {
    expect([...SUPPORTED_LANGUAGE_CODES]).toEqual([...CONTACT_I18N_FIXTURES.languages]);

    for (const lang of CONTACT_I18N_FIXTURES.languages) {
      const contactDict = CONTACT_I18N[lang];
      const uiEntry = UI_I18N[lang];
      expect(isRecord(uiEntry)).toBe(true);
      if (isRecord(uiEntry)) {
        expect(uiEntry['contacts']).toBe(contactDict);
      }

      for (const key of CONTACT_I18N_FIXTURES.topLevelKeys) {
        const value = contactDict[key];
        expect(typeof value).toBe('string');
        expect(value.trim().length).toBeGreaterThan(0);
        expect(value.startsWith('contacts.')).toBe(false);
      }

      for (const fieldErrorMap of Object.values(CONTACT_FIELD_ERROR_KEYS)) {
        for (const errorPath of Object.values(fieldErrorMap)) {
          const resolved = resolveTranslationPath(uiEntry, errorPath);
          expect(typeof resolved).toBe('string');
          expect(typeof resolved === 'string' && resolved.trim().length > 0).toBe(true);
        }
      }

      for (const submissionPath of Object.values(CONTACT_SUBMISSION_ERROR_KEYS)) {
        const resolved = resolveTranslationPath(uiEntry, submissionPath);
        expect(typeof resolved).toBe('string');
        expect(typeof resolved === 'string' && resolved.trim().length > 0).toBe(true);
      }
    }
  });

  it('should provide distinct localized contact strings in pt, en, es, fr, and de without English or Portuguese fallbacks', () => {
    for (const key of CONTACT_I18N_FIXTURES.distinctKeys) {
      const values = CONTACT_I18N_FIXTURES.languages.map((lang) => CONTACT_I18N[lang][key]);
      expect(new Set(values).size).toBe(CONTACT_I18N_FIXTURES.languages.length);
    }

    const requiredNameErrors = CONTACT_I18N_FIXTURES.languages.map(
      (lang) => CONTACT_I18N[lang].errors.name.required
    );
    expect(new Set(requiredNameErrors).size).toBe(CONTACT_I18N_FIXTURES.languages.length);

    const networkErrors = CONTACT_I18N_FIXTURES.languages.map(
      (lang) => CONTACT_I18N[lang]['submission-errors'].network
    );
    expect(new Set(networkErrors).size).toBe(CONTACT_I18N_FIXTURES.languages.length);

    for (const lang of CONTACT_I18N_FIXTURES.languages) {
      const sample = CONTACT_I18N_FIXTURES.sampleTranslations[lang];
      expect(CONTACT_I18N[lang].submit).toBe(sample.submit);
      expect(CONTACT_I18N[lang].retry).toBe(sample.retry);
      expect(CONTACT_I18N[lang].errors.name.required).toBe(sample.nameRequired);
      expect(CONTACT_I18N[lang]['recaptcha-notice'].before).toContain('reCAPTCHA');
      expect(CONTACT_I18N[lang]['privacy-notice']).not.toContain('reCAPTCHA');
      expect(CONTACT_I18N[lang]['privacy-notice'].length).toBeLessThanOrEqual(160);
    }
  });
});
