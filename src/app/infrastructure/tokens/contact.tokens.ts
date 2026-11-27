import { isPlatformBrowser } from '@angular/common';
import {
  DestroyRef,
  EnvironmentInjector,
  InjectionToken,
  PLATFORM_ID,
  PendingTasks,
  inject
} from '@angular/core';
import { environment } from '../../../environments/environment';
import type { AntiSpamTokenPort } from '../../domain/ports/anti-spam-token.port';

export const CONTACT_ENDPOINT = new InjectionToken<string>('CONTACT_ENDPOINT', {
  providedIn: 'root',
  factory: () => '/api/v1/contact'
});

export const RECAPTCHA_SITE_KEY = new InjectionToken<string>('RECAPTCHA_SITE_KEY', {
  providedIn: 'root',
  factory: () => environment.recaptchaSiteKey
});

export const ANTI_SPAM_PRODUCTION = new InjectionToken<boolean>('ANTI_SPAM_PRODUCTION', {
  providedIn: 'root',
  factory: () => environment.production
});

export function createLazyRecaptchaAntiSpamPort(): AntiSpamTokenPort {
  const injector = inject(EnvironmentInjector);
  const destroyRef = inject(DestroyRef);
  const pendingTasks = inject(PendingTasks);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  let destroyed = false;
  let portPromise: Promise<AntiSpamTokenPort> | undefined;
  const cleanupLoadTasks = new Set<() => void>();

  destroyRef.onDestroy(() => {
    destroyed = true;
    for (const finish of cleanupLoadTasks) {
      finish();
    }
    cleanupLoadTasks.clear();
  });

  const loadPort = (): Promise<AntiSpamTokenPort> => {
    if (destroyed) {
      return Promise.reject(new Error('Anti-spam injector destroyed.'));
    }
    if (portPromise !== undefined) {
      return portPromise;
    }

    const done = pendingTasks.add();
    let finished = false;
    const finish = (): void => {
      if (!finished) {
        finished = true;
        cleanupLoadTasks.delete(finish);
        done();
      }
    };
    cleanupLoadTasks.add(finish);

    portPromise = import('../services/recaptcha-anti-spam.service')
      .then(({ RecaptchaAntiSpamService }) => {
        if (destroyed) {
          throw new Error('Anti-spam injector destroyed.');
        }
        return injector.get(RecaptchaAntiSpamService);
      })
      .catch((error: unknown) => {
        portPromise = undefined;
        throw error;
      })
      .finally(finish);

    return portPromise;
  };

  return {
    init(): void {
      if (!isBrowser || destroyed) {
        return;
      }
      void loadPort()
        .then((port) => {
          if (!destroyed) {
            port.init();
          }
        })
        .catch(() => undefined);
    },
    async execute(action: string): Promise<string> {
      if (!isBrowser || destroyed) {
        throw new Error('Anti-spam verification is only available in the browser.');
      }
      const port = await loadPort();
      if (destroyed) {
        throw new Error('Anti-spam injector destroyed.');
      }
      return port.execute(action);
    }
  };
}

export const ANTI_SPAM_TOKEN_PORT = new InjectionToken<AntiSpamTokenPort>(
  'ANTI_SPAM_TOKEN_PORT',
  {
    providedIn: 'root',
    factory: createLazyRecaptchaAntiSpamPort
  }
);
