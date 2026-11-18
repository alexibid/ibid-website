export interface MockRequest {
  readonly method: string;
  readonly originalUrl: string;
  readonly headers: { readonly cookie?: string };
}

export function mockRequest(method: string, originalUrl: string, cookie?: string): MockRequest {
  return { method, originalUrl, headers: cookie === undefined ? {} : { cookie } };
}

export const MOCK_WRITE_ROUTES: readonly (readonly [string, string])[] = [
  ['POST', '/api/v1/pages'],
  ['PATCH', '/api/v1/pages/0b9c6f1e-6a4f-4a7e-9a55-2a7f7c3b1d10'],
  ['DELETE', '/api/v1/pages/0b9c6f1e-6a4f-4a7e-9a55-2a7f7c3b1d10'],
  ['POST', '/api/v1/urls'],
  ['PATCH', '/api/v1/urls/9a1d2e3f-0000-4000-8000-000000000001'],
  ['DELETE', '/api/v1/urls/9a1d2e3f-0000-4000-8000-000000000001'],
  ['POST', '/api/v1/media'],
  ['PUT', '/api/v1/pages/0b9c6f1e-6a4f-4a7e-9a55-2a7f7c3b1d10'],
  ['POST', '/api/v1/auth/logout'],
];

export const MOCK_READ_ROUTES: readonly (readonly [string, string])[] = [
  ['GET', '/api/v1/pages?type=chapter&lang=pt'],
  ['GET', '/api/v1/urls'],
  ['GET', '/api/v1/snapshot'],
  ['GET', '/api/v1/health'],
  ['HEAD', '/api/v1/pages'],
];
