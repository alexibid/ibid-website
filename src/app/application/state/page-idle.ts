export const PAGE_IDLE_TIMEOUT_MS = 2000;

function afterWindowLoad(): Promise<void> {
  if (typeof window === 'undefined' || document.readyState === 'complete') return Promise.resolve();
  return new Promise((resolve) => window.addEventListener('load', () => resolve(), { once: true }));
}

function afterMainThreadIdle(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(() => resolve(), { timeout: PAGE_IDLE_TIMEOUT_MS });
      return;
    }
    setTimeout(resolve);
  });
}

export async function afterPageLoadIdle(): Promise<void> {
  await afterWindowLoad();
  await afterMainThreadIdle();
}
