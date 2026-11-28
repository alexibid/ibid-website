import type { Locator, Page } from '@playwright/test';
import { CONTACT_I18N, type ContactTranslations } from '../../src/app/domain/constants/contact-i18n';
import type { SupportedLanguage } from '../../src/app/domain/constants/languages';
import { PUBLIC_SITE_FIXTURES, type PublicSiteLanguage } from '../../src/mocks/public-site.mock';
import { offsetHostScrollWithProbe, readScrollState, type ContactScrollState } from './contact-scroll';

export const CONTACT_ROUTES: Readonly<Record<PublicSiteLanguage, string>> = PUBLIC_SITE_FIXTURES.contactRoutes;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildAllFieldErrorsPattern(lang: SupportedLanguage): RegExp {
  const { name, email, message } = CONTACT_I18N[lang].errors;
  const messages = [
    ...Object.values(name),
    ...Object.values(email),
    ...Object.values(message)
  ].map(escapeRegExp);
  return new RegExp(`^(?:${messages.join('|')})$`);
}

async function isLocatorFocused(target: Locator): Promise<boolean> {
  return target.evaluate((element) => element === document.activeElement);
}

export interface LayoutRect {
  readonly top: number; readonly right: number; readonly bottom: number;
  readonly left: number; readonly width: number; readonly height: number;
}

export interface RenderedElementMetrics extends LayoutRect {
  readonly scrollWidth: number; readonly clientWidth: number;
  readonly scrollHeight: number; readonly clientHeight: number;
  readonly lineHeight: number; readonly lineCount: number; readonly clientRectCount: number;
}

export interface ResolvedElementStyle {
  readonly backgroundColor: string; readonly borderColor: string; readonly color: string;
  readonly outlineStyle: string; readonly outlineWidth: string; readonly outlineColor: string;
  readonly boxShadow: string; readonly cursor: string; readonly transform: string;
  readonly transitionDuration: string;
}

export interface ContactSectionBounds {
  readonly isDesktop: boolean; readonly columnWidth: number;
  readonly host: LayoutRect; readonly section: LayoutRect; readonly form: LayoutRect;
  readonly columns: readonly Pick<LayoutRect, 'top' | 'right' | 'bottom' | 'left'>[];
}

export class ContactPage {
  private currentLang: SupportedLanguage = 'pt';

  constructor(public readonly page: Page) {}

  get lang(): SupportedLanguage {
    return this.currentLang;
  }

  get translations(): ContactTranslations {
    return CONTACT_I18N[this.currentLang];
  }

  get form(): Locator {
    return this.page.getByRole('form');
  }

  get formHeading(): Locator {
    return this.page.getByRole('heading', { level: 2 }).first();
  }

  get nameLabel(): Locator {
    return this.form.getByText(this.translations.name, { exact: true });
  }

  get emailLabel(): Locator {
    return this.form.getByText(this.translations.email, { exact: true });
  }

  get messageLabel(): Locator {
    return this.form.getByText(this.translations.message, { exact: true });
  }

  get nameInput(): Locator {
    return this.form.getByLabel(this.translations.name, { exact: true });
  }

  get emailInput(): Locator {
    return this.form.getByLabel(this.translations.email, { exact: true });
  }

  get messageInput(): Locator {
    return this.form.getByLabel(this.translations.message, { exact: true });
  }

  get submitButton(): Locator {
    return this.form.getByRole('button', { name: this.translations.submit, exact: true });
  }

  get submittingButton(): Locator {
    return this.form.getByRole('button', { name: this.translations.submitting, exact: true });
  }

  get retryButton(): Locator {
    return this.errorAlert.getByRole('button', { name: this.translations.retry, exact: true });
  }

  get sendAnotherButton(): Locator {
    return this.confirmationBanner.getByRole('button', {
      name: this.translations['send-another'],
      exact: true
    });
  }

  get languageTrigger(): Locator {
    return this.page.getByRole('button', { name: /^Change language:/i });
  }

  languageOption(lang: SupportedLanguage): Locator {
    return this.page.getByRole('button', { name: lang.toUpperCase(), exact: true });
  }

  get errorAlert(): Locator {
    return this.form.getByRole('alert');
  }

  get confirmationBanner(): Locator {
    return this.form.getByRole('region', {
      name: this.translations['success-title'],
      exact: true
    });
  }

  fieldError(text?: string | RegExp): Locator {
    if (text === undefined) {
      return this.form.getByText(buildAllFieldErrorsPattern(this.currentLang));
    }
    if (typeof text === 'string') {
      return this.form.getByText(text, { exact: true });
    }
    return this.form.getByText(text);
  }

  get privacyNotice(): Locator {
    return this.form.getByText(this.translations['privacy-notice'], { exact: true });
  }

  async goto(lang: PublicSiteLanguage = 'pt'): Promise<void> {
    this.currentLang = lang;
    await this.page.goto(CONTACT_ROUTES[lang]);
    await this.form.waitFor({ state: 'visible' });
  }

  async switchLanguage(lang: PublicSiteLanguage): Promise<void> {
    await this.languageTrigger.click();
    const option = this.languageOption(lang);
    await option.waitFor({ state: 'visible' });
    await option.click();
    this.currentLang = lang;
    await this.page.waitForURL(new RegExp(`${escapeRegExp(CONTACT_ROUTES[lang])}$`));
    await this.privacyNotice.waitFor({ state: 'visible' });
  }

  async tabTo(target: Locator, maxTabs = 25): Promise<void> {
    await target.waitFor({ state: 'visible' });
    if (await isLocatorFocused(target)) {
      return;
    }
    for (let step = 0; step < maxTabs; step++) {
      await this.page.keyboard.press('Tab');
      if (await isLocatorFocused(target)) {
        return;
      }
    }
    throw new Error(`Unable to reach target element within ${maxTabs} Tab presses.`);
  }

  async hasHorizontalOverflow(): Promise<boolean> {
    const documentOverflow = await this.page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    if (documentOverflow) {
      return true;
    }
    return this.form.evaluate((formElement) => {
      const viewportWidth = window.innerWidth;
      const formRect = formElement.getBoundingClientRect();
      if (formRect.left < -1 || formRect.right > viewportWidth + 1) {
        return true;
      }
      return Array.from(formElement.children).some((child) => {
        if (!(child instanceof HTMLElement) || child.getAttribute('aria-hidden') === 'true') {
          return false;
        }
        const style = window.getComputedStyle(child);
        if (style.display === 'none' || style.visibility === 'hidden') {
          return false;
        }
        const rect = child.getBoundingClientRect();
        return (
          rect.width > 0 &&
          (rect.left < -1 ||
            rect.right > viewportWidth + 1 ||
            rect.left < formRect.left - 1 ||
            rect.right > formRect.right + 1)
        );
      });
    });
  }

  async movePointerOut(): Promise<void> {
    await this.page.mouse.move(0, 0);
  }

  async resetFocusAnchor(): Promise<void> {
    await this.formHeading.click();
  }

  async readRenderedMetrics(target: Locator): Promise<RenderedElementMetrics> {
    return target.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const range = document.createRange();
      range.selectNodeContents(element);
      const textRects = Array.from(range.getClientRects()).filter((item) => item.width > 0 && item.height > 0);
      return {
        top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height,
        scrollWidth: element.scrollWidth, clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight, clientHeight: element.clientHeight,
        lineHeight: parseFloat(style.lineHeight) || rect.height,
        lineCount: new Set(textRects.map((item) => Math.round(item.top))).size,
        clientRectCount: element.getClientRects().length
      };
    });
  }

  async readResolvedStyle(target: Locator): Promise<ResolvedElementStyle> {
    return target.evaluate((element) => {
      const s = window.getComputedStyle(element);
      return {
        backgroundColor: s.backgroundColor, borderColor: s.borderColor, color: s.color,
        outlineStyle: s.outlineStyle, outlineWidth: s.outlineWidth, outlineColor: s.outlineColor,
        boxShadow: s.boxShadow, cursor: s.cursor, transform: s.transform, transitionDuration: s.transitionDuration
      };
    });
  }

  async readSectionBounds(): Promise<ContactSectionBounds> {
    return this.form.evaluate((formElement) => {
      const host = formElement.closest('website-exit');
      const section = formElement.closest('.page-section');
      if (!(host instanceof HTMLElement) || !(section instanceof HTMLElement)) {
        throw new Error('Contact form is not inside website-exit .page-section');
      }
      const toRect = (r: DOMRect): LayoutRect => ({
        top: r.top, right: r.right, bottom: r.bottom, left: r.left, width: r.width, height: r.height
      });
      const hostRect = toRect(host.getBoundingClientRect());
      const hostStyle = window.getComputedStyle(host);
      const [padLeft, padRight, padTop, padBottom, colGap] = [
        parseFloat(hostStyle.paddingLeft) || 0,
        parseFloat(hostStyle.paddingRight) || 0,
        parseFloat(hostStyle.paddingTop) || 0,
        parseFloat(hostStyle.paddingBottom) || 0,
        parseFloat(hostStyle.columnGap) || 0
      ];
      const isDesktop = window.innerWidth >= 768;
      const columnWidth = isDesktop
        ? (hostRect.width - padLeft - padRight - colGap) / 2
        : hostRect.width - padLeft - padRight;
      const [colTop, colBottom, firstLeft] = [hostRect.top + padTop, hostRect.bottom - padBottom, hostRect.left + padLeft];
      const columns = isDesktop
        ? [
            { left: firstLeft, right: firstLeft + columnWidth, top: colTop, bottom: colBottom },
            { left: firstLeft + columnWidth + colGap, right: firstLeft + 2 * columnWidth + colGap, top: colTop, bottom: colBottom }
          ]
        : [{ left: firstLeft, right: firstLeft + columnWidth, top: colTop, bottom: colBottom }];
      return {
        isDesktop,
        columnWidth,
        host: hostRect,
        section: toRect(section.getBoundingClientRect()),
        form: toRect(formElement.getBoundingClientRect()),
        columns
      };
    });
  }

  offsetHostScrollWithProbe(): Promise<number> { return offsetHostScrollWithProbe(this.form); }
  readScrollState(): Promise<ContactScrollState> { return readScrollState(this.form, this.confirmationBanner); }
}
