import type { Locator } from '@playwright/test';

export interface ScrollToCall {
  readonly left?: number;
  readonly top?: number;
  readonly behavior?: string;
}

export interface ContactScrollState {
  readonly documentScrollBehavior: string;
  readonly bookPagesScrollBehavior: string;
  readonly hostScrollBehavior: string;
  readonly bannerScrollBehavior: string;
  readonly hostScrollLeft: number;
  readonly hostClientWidth: number;
  readonly hostScrollWidth: number;
  readonly scrollToCalls: readonly ScrollToCall[];
}

export async function offsetHostScrollWithProbe(form: Locator): Promise<number> {
  return form.evaluate((formElement) => {
    const host = formElement.closest('website-exit');
    if (!(host instanceof HTMLElement)) {
      throw new Error('Contact form is not inside website-exit');
    }
    const calls: ScrollToCall[] = [];
    Reflect.set(host, '__contactScrollToCalls', calls);
    const originalScrollTo = host.scrollTo.bind(host);
    host.scrollTo = (optionsOrX?: ScrollToOptions | number, y?: number): void => {
      if (typeof optionsOrX === 'number') {
        calls.push({ left: optionsOrX, top: y });
        originalScrollTo(optionsOrX, y ?? 0);
        return;
      }
      calls.push({
        left: optionsOrX?.left,
        top: optionsOrX?.top,
        behavior: optionsOrX?.behavior
      });
      originalScrollTo(optionsOrX);
    };
    const maxScroll = Math.max(0, host.scrollWidth - host.clientWidth);
    host.scrollLeft = Math.min(host.clientWidth, maxScroll);
    return host.scrollLeft;
  });
}

export async function readScrollState(form: Locator, banner: Locator): Promise<ContactScrollState> {
  const bannerScrollBehavior = await banner.evaluate(
    (element) => window.getComputedStyle(element).scrollBehavior
  );
  return form.evaluate((formElement, resolvedBannerScrollBehavior) => {
    const host = formElement.closest('website-exit');
    const bookPages = formElement.closest('.book-pages');
    if (!(host instanceof HTMLElement) || !(bookPages instanceof HTMLElement)) {
      throw new Error('Contact form is not inside website-exit .book-pages');
    }
    const rawCalls: unknown = Reflect.get(host, '__contactScrollToCalls');
    const scrollToCalls: ScrollToCall[] = [];
    if (Array.isArray(rawCalls)) {
      for (const entry of rawCalls) {
        if (typeof entry === 'object' && entry !== null) {
          const left = Reflect.get(entry, 'left');
          const top = Reflect.get(entry, 'top');
          const behavior = Reflect.get(entry, 'behavior');
          scrollToCalls.push({
            left: typeof left === 'number' ? left : undefined,
            top: typeof top === 'number' ? top : undefined,
            behavior: typeof behavior === 'string' ? behavior : undefined
          });
        }
      }
    }
    return {
      documentScrollBehavior: window.getComputedStyle(document.documentElement).scrollBehavior,
      bookPagesScrollBehavior: window.getComputedStyle(bookPages).scrollBehavior,
      hostScrollBehavior: window.getComputedStyle(host).scrollBehavior,
      bannerScrollBehavior: resolvedBannerScrollBehavior,
      hostScrollLeft: host.scrollLeft,
      hostClientWidth: host.clientWidth,
      hostScrollWidth: host.scrollWidth,
      scrollToCalls
    };
  }, bannerScrollBehavior);
}
