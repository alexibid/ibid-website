import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { EnvironmentProviders, PLATFORM_ID, inject, provideAppInitializer } from '@angular/core';
import { environment } from '../../../environments/environment';
import { STYLESHEET_MANIFEST_ID } from '../../domain/constants/page-stylesheets';

const SERVICE_WORKER_URL = '/service-worker.js';

function registerServiceWorker(navigator: Navigator): void {
  navigator.serviceWorker.register(SERVICE_WORKER_URL).catch((error: unknown) => console.error(error));
}

function isPublishedBuild(document: Document): boolean {
  return document.getElementById(STYLESHEET_MANIFEST_ID) !== null;
}

function registerAfterLoad(document: Document): void {
  const view = document.defaultView;
  if (!view || !('serviceWorker' in view.navigator) || !isPublishedBuild(document)) return;
  if (document.readyState === 'complete') registerServiceWorker(view.navigator);
  else view.addEventListener('load', () => registerServiceWorker(view.navigator), { once: true });
}

export function provideServiceWorkerRegistration(): EnvironmentProviders {
  return provideAppInitializer(() => {
    if (environment.production && isPlatformBrowser(inject(PLATFORM_ID))) registerAfterLoad(inject(DOCUMENT));
  });
}
