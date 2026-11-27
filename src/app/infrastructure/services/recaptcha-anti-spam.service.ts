import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import type { AntiSpamTokenPort } from '../../domain/ports/anti-spam-token.port';
import { ANTI_SPAM_PRODUCTION, RECAPTCHA_SITE_KEY } from '../tokens/contact.tokens';

export const DEV_ANTI_SPAM_TOKEN = 'dev-anti-spam-token';

const RECAPTCHA_SCRIPT_URL = 'https://www.google.com/recaptcha/api.js';
const RECAPTCHA_TIMEOUT_MS = 10_000;

function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null;
}

function isPromiseLike(value: unknown): boolean {
  return (
    value instanceof Promise ||
    (isObject(value) && typeof Reflect.get(value, 'then') === 'function')
  );
}

function requireGrecaptchaObject(target: object): object {
  const api: unknown = Reflect.get(target, 'grecaptcha');
  if (!isObject(api)) {
    throw new Error('reCAPTCHA API is unavailable.');
  }
  return api;
}

function hasGrecaptchaReady(target: object): boolean {
  const api: unknown = Reflect.get(target, 'grecaptcha');
  return isObject(api) && typeof Reflect.get(api, 'ready') === 'function';
}

async function invokeGrecaptchaExecute(
  api: object,
  siteKey: string,
  action: string
): Promise<string> {
  const execute: unknown = Reflect.get(api, 'execute');
  if (typeof execute !== 'function') {
    throw new Error('reCAPTCHA execute API is unavailable.');
  }
  const result: unknown = Reflect.apply(execute, api, [siteKey, { action }]);
  if (!isPromiseLike(result)) {
    throw new Error('reCAPTCHA execute did not return a promise.');
  }
  const token: unknown = await Promise.resolve(result);
  if (typeof token !== 'string' || !token.trim()) {
    throw new Error('reCAPTCHA returned an empty verification token.');
  }
  return token;
}

@Injectable({
  providedIn: 'root'
})
export class RecaptchaAntiSpamService implements AntiSpamTokenPort {
  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly siteKey = inject(RECAPTCHA_SITE_KEY);
  private readonly isProduction = inject(ANTI_SPAM_PRODUCTION);
  private readonly destroyRef = inject(DestroyRef);

  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private scriptLoadPromise: Promise<void> | undefined;
  private readonly activeTimeouts = new Set<ReturnType<typeof setTimeout>>();
  private destroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      for (const timeoutId of this.activeTimeouts) {
        clearTimeout(timeoutId);
      }
      this.activeTimeouts.clear();
      this.scriptLoadPromise = undefined;
    });
  }

  public init(): void {
    const trimmedSiteKey = this.siteKey.trim();
    if (!this.isBrowser || !trimmedSiteKey) {
      return;
    }
    void this.ensureScriptLoaded().catch(() => undefined);
  }

  public async execute(action: string): Promise<string> {
    if (!this.isBrowser) {
      throw new Error('Anti-spam verification is only available in the browser.');
    }

    const trimmedSiteKey = this.siteKey.trim();
    if (!trimmedSiteKey) {
      if (!this.isProduction) {
        return DEV_ANTI_SPAM_TOKEN;
      }
      throw new Error('reCAPTCHA site key is not configured for production.');
    }

    await this.ensureScriptLoaded();

    const targetWindow = this.requireWindow();
    await this.waitForGrecaptchaReady(targetWindow);

    return invokeGrecaptchaExecute(
      requireGrecaptchaObject(targetWindow),
      trimmedSiteKey,
      action
    );
  }

  private ensureScriptLoaded(): Promise<void> {
    if (this.scriptLoadPromise !== undefined) {
      return this.scriptLoadPromise;
    }

    const trimmedSiteKey = this.siteKey.trim();
    if (!this.isBrowser || !trimmedSiteKey) {
      return Promise.reject(
        new Error('reCAPTCHA script cannot load without a browser and site key.')
      );
    }

    if (hasGrecaptchaReady(this.requireWindow())) {
      this.scriptLoadPromise = Promise.resolve();
      return this.scriptLoadPromise;
    }

    const head = this.document.head;
    if (!head) {
      return Promise.reject(
        new Error('Document head is unavailable for reCAPTCHA script loading.')
      );
    }

    const existingCandidate = head.querySelector(`script[src^="${RECAPTCHA_SCRIPT_URL}"]`);
    const isExistingScript = existingCandidate instanceof HTMLScriptElement;
    if (isExistingScript && existingCandidate.getAttribute('data-recaptcha-loaded') === 'true') {
      this.scriptLoadPromise = Promise.resolve();
      return this.scriptLoadPromise;
    }

    let resolveLoad: () => void = () => undefined;
    let rejectLoad: (reason: Error) => void = () => undefined;
    const promise = new Promise<void>((resolve, reject) => {
      resolveLoad = resolve;
      rejectLoad = reject;
    });
    this.scriptLoadPromise = promise;

    const script = isExistingScript
      ? existingCandidate
      : this.createRecaptchaScript(trimmedSiteKey);

    this.bindScriptLifecycle(script, promise, { resolve: resolveLoad, reject: rejectLoad });

    if (!isExistingScript) {
      head.appendChild(script);
    }

    return promise;
  }

  private bindScriptLifecycle(
    script: HTMLScriptElement,
    promise: Promise<void>,
    callbacks: { readonly resolve: () => void; readonly reject: (reason: Error) => void }
  ): void {
    let settled = false;

    const cleanup = (): void => {
      script.onload = null;
      script.onerror = null;
    };

    const fail = (message: string): void => {
      if (settled) {
        return;
      }
      settled = true;
      this.clearTrackedTimeout(timeoutId);
      cleanup();
      script.remove();
      if (this.scriptLoadPromise === promise) {
        this.scriptLoadPromise = undefined;
      }
      callbacks.reject(new Error(message));
    };

    const timeoutId = this.trackTimeout(() => {
      fail('Timed out while loading reCAPTCHA script.');
    }, RECAPTCHA_TIMEOUT_MS);

    script.onload = (): void => {
      if (settled) {
        return;
      }
      settled = true;
      this.clearTrackedTimeout(timeoutId);
      cleanup();
      script.setAttribute('data-recaptcha-loaded', 'true');
      callbacks.resolve();
    };

    script.onerror = (): void => {
      fail('Failed to load reCAPTCHA script.');
    };
  }

  private waitForGrecaptchaReady(targetWindow: object): Promise<void> {
    const api = requireGrecaptchaObject(targetWindow);
    const ready: unknown = Reflect.get(api, 'ready');
    if (typeof ready !== 'function') {
      return Promise.reject(new Error('reCAPTCHA ready API is unavailable.'));
    }

    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const timeoutId = this.trackTimeout(() => {
        if (settled) {
          return;
        }
        settled = true;
        reject(new Error('Timed out waiting for reCAPTCHA readiness.'));
      }, RECAPTCHA_TIMEOUT_MS);

      try {
        Reflect.apply(ready, api, [
          (): void => {
            if (settled) {
              return;
            }
            settled = true;
            this.clearTrackedTimeout(timeoutId);
            resolve();
          }
        ]);
      } catch (error: unknown) {
        if (!settled) {
          settled = true;
          this.clearTrackedTimeout(timeoutId);
          reject(error instanceof Error ? error : new Error('Failed to initialize reCAPTCHA.'));
        }
      }
    });
  }

  private requireWindow(): object {
    const targetWindow =
      this.document.defaultView ?? (typeof window !== 'undefined' ? window : undefined);
    if (!targetWindow) {
      throw new Error('Window object is unavailable.');
    }
    return targetWindow;
  }

  private createRecaptchaScript(siteKey: string): HTMLScriptElement {
    const script = this.document.createElement('script');
    script.src = `${RECAPTCHA_SCRIPT_URL}?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    return script;
  }

  private trackTimeout(callback: () => void, delayMs: number): ReturnType<typeof setTimeout> {
    const timeoutId = setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      if (!this.destroyed) {
        callback();
      }
    }, delayMs);
    this.activeTimeouts.add(timeoutId);
    return timeoutId;
  }

  private clearTrackedTimeout(timeoutId: ReturnType<typeof setTimeout>): void {
    clearTimeout(timeoutId);
    this.activeTimeouts.delete(timeoutId);
  }
}
