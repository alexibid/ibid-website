import { PAGE_IDLE_TIMEOUT_MS, afterPageLoadIdle } from './page-idle';

type IdleCallbackStub = (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;

function stubReadyState(state: DocumentReadyState): void {
  vi.spyOn(document, 'readyState', 'get').mockReturnValue(state);
}

function trackSettled(promise: Promise<void>): () => boolean {
  let settled = false;
  void promise.then(() => (settled = true));
  return () => settled;
}

describe('afterPageLoadIdle', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should wait for the window load event and then for an idle callback with a timeout', async () => {
    stubReadyState('loading');
    const queued: IdleRequestCallback[] = [];
    const requestIdle = vi.fn<IdleCallbackStub>((callback) => queued.push(callback));
    vi.stubGlobal('requestIdleCallback', requestIdle);

    const idle = afterPageLoadIdle();
    const isSettled = trackSettled(idle);
    await Promise.resolve();
    expect(requestIdle).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('load'));
    await Promise.resolve();
    expect(requestIdle).toHaveBeenCalledWith(expect.any(Function), { timeout: PAGE_IDLE_TIMEOUT_MS });
    expect(isSettled()).toBe(false);

    queued.forEach((callback) => callback({ didTimeout: false, timeRemaining: () => 50 }));
    await expect(idle).resolves.toBeUndefined();
  });

  it('should fall back to a macrotask when requestIdleCallback is unavailable', async () => {
    vi.useFakeTimers();
    stubReadyState('complete');
    vi.stubGlobal('requestIdleCallback', undefined);

    const isSettled = trackSettled(afterPageLoadIdle());
    await Promise.resolve();
    expect(isSettled()).toBe(false);

    await vi.advanceTimersByTimeAsync(0);
    expect(isSettled()).toBe(true);
  });
});
