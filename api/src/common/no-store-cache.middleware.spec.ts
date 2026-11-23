import { vi } from 'vitest';
import { noStoreCacheMiddleware } from './no-store-cache.middleware';
import { NO_STORE_FIXTURES } from '../mocks/no-store-cache.mock';

function createResponse(): { readonly setHeader: ReturnType<typeof vi.fn> } {
  return { setHeader: vi.fn() };
}

describe('noStoreCacheMiddleware', () => {
  it('should set Cache-Control no-store so saved pages are never served stale', () => {
    const response = createResponse();
    const next = vi.fn();

    noStoreCacheMiddleware(NO_STORE_FIXTURES.request, response, next);

    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
  });

  it('should set the header before calling next exactly once', () => {
    const calls: string[] = [];
    const response = { setHeader: vi.fn(() => calls.push('header')) };
    const next = vi.fn(() => calls.push('next'));

    noStoreCacheMiddleware(NO_STORE_FIXTURES.request, response, next);

    expect(calls).toEqual(['header', 'next']);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
