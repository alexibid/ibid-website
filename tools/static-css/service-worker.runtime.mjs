export function runServiceWorker(build) {
  const worker = globalThis;
  const CACHE_PREFIX = 'ibid-website-';
  const STATIC_CACHE = `${CACHE_PREFIX}static-${build.version}`;
  const PAGE_CACHE = `${CACHE_PREFIX}pages-${build.version}`;
  const MEDIA_CACHE = `${CACHE_PREFIX}media-${build.version}`;
  const FONT_CACHE = `${CACHE_PREFIX}fonts`;
  const CURRENT_CACHES = new Set([STATIC_CACHE, PAGE_CACHE, MEDIA_CACHE, FONT_CACHE]);
  const BYPASSED_PATHS = /^\/(admin|api)(\/|$)/;
  const IMMUTABLE_ASSET = /^\/[\w.-]+-[A-Za-z0-9_-]{8}\.(js|css)$/;
  const CONTENT_PATH = /^\/pages\//;
  const IMAGE_PATH = /^\/images\//;
  const FONT_FILE = /\.woff2$/;
  const FONT_ORIGIN = 'https://fonts.gstatic.com';

  const removeStaleCaches = async () => {
    const names = (await caches.keys()).filter((name) => name.startsWith(CACHE_PREFIX));
    const previousStatic = names.filter((name) => name.startsWith(`${CACHE_PREFIX}static-`) && name !== STATIC_CACHE).slice(-1);
    const kept = new Set([...CURRENT_CACHES, ...previousStatic]);
    const stale = names.filter((name) => !kept.has(name));
    await Promise.all(stale.map((name) => caches.delete(name)));
  };

  const enableNavigationPreload = async () => {
    if (worker.registration.navigationPreload) await worker.registration.navigationPreload.enable();
  };

  const storeFresh = async (request, response) => {
    if (!response.ok || response.type !== 'basic') return;
    const cache = await caches.open(PAGE_CACHE);
    await cache.put(request, response);
  };

  const networkFirst = async (event) => {
    try {
      const preloaded = event.request.mode === 'navigate' ? await event.preloadResponse : undefined;
      const response = preloaded ?? (await fetch(event.request));
      event.waitUntil(storeFresh(event.request, response.clone()));
      return response;
    } catch (error) {
      const cached = await caches.match(event.request);
      if (cached) return cached;
      throw error;
    }
  };

  const isHtml = (response) => (response.headers.get('content-type') ?? '').includes('text/html');
  const isCacheableAsset = (response) => response.ok && !isHtml(response);
  const isCacheableMedia = (response) => response.type !== 'opaque' && isCacheableAsset(response);

  const cacheFirst = async (request) => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (isCacheableAsset(response)) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  };

  const keepInCache = async (cacheName, request, response) => {
    const cache = await caches.open(cacheName);
    await cache.put(request, response).catch(() => undefined);
  };

  const fetchIntoCache = async (event, cacheName) => {
    const response = await fetch(event.request);
    if (isCacheableMedia(response)) event.waitUntil(keepInCache(cacheName, event.request, response.clone()));
    return response;
  };

  const cacheOnlyIn = async (event, cacheName) => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(event.request);
    return cached ?? (await fetchIntoCache(event, cacheName).catch(() => Response.error()));
  };

  const mediaStrategyFor = (event, url) => {
    if (url.origin === FONT_ORIGIN) return () => cacheOnlyIn(event, FONT_CACHE);
    if (url.origin !== worker.location.origin) return undefined;
    if (IMAGE_PATH.test(url.pathname) || FONT_FILE.test(url.pathname)) return () => cacheOnlyIn(event, MEDIA_CACHE);
    return undefined;
  };

  const strategyFor = (event) => {
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET') return undefined;
    if (url.origin !== worker.location.origin) return mediaStrategyFor(event, url);
    if (BYPASSED_PATHS.test(url.pathname)) return undefined;
    if (event.request.mode === 'navigate' || CONTENT_PATH.test(url.pathname)) return () => networkFirst(event);
    if (IMMUTABLE_ASSET.test(url.pathname)) return () => cacheFirst(event.request);
    return mediaStrategyFor(event, url);
  };

  worker.addEventListener('install', (event) => {
    event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(build.precache)).then(() => worker.skipWaiting()));
  });

  worker.addEventListener('activate', (event) => {
    event.waitUntil(Promise.all([removeStaleCaches(), enableNavigationPreload()]).then(() => worker.clients.claim()));
  });

  worker.addEventListener('fetch', (event) => {
    const strategy = strategyFor(event);
    if (strategy) event.respondWith(strategy());
  });
}
