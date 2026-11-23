import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes.development';
import { RoutingService } from './infrastructure/services/routing.service';
import { ADMIN_CONTENT_REPOSITORY } from './infrastructure/tokens/content-repository.token';
import { ADMIN_NAVIGATION_FIXTURES } from '../mocks/app-routes.mock';
import { createMockAdminRepository } from '../mocks/admin.mock';

describe('development routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: ADMIN_CONTENT_REPOSITORY, useValue: createMockAdminRepository() },
        {
          provide: RoutingService,
          useValue: {
            loadRoutes: vi.fn().mockResolvedValue(undefined),
            hasPage: vi.fn().mockReturnValue(false),
            getPage: vi.fn()
          }
        }
      ]
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should open /admin without a login screen in development', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl(ADMIN_NAVIGATION_FIXTURES.adminUrl);

    const page: HTMLElement = harness.fixture.nativeElement;
    const text = (page.textContent ?? '').toLowerCase();
    const manageLinks = Array.from(page.querySelectorAll('a[href^="/admin/"]')).map((link) =>
      link.getAttribute('href')
    );

    expect(TestBed.inject(Router).url).toBe(ADMIN_NAVIGATION_FIXTURES.adminUrl);
    expect(page.textContent).toContain(ADMIN_NAVIGATION_FIXTURES.heading);
    expect(page.querySelector('website-admin-layout')).not.toBeNull();
    expect(manageLinks).toEqual(expect.arrayContaining(ADMIN_NAVIGATION_FIXTURES.manageLinks));
    expect(page.querySelector('input[type="password"]')).toBeNull();
    for (const marker of ADMIN_NAVIGATION_FIXTURES.loginMarkers) {
      expect(text).not.toContain(marker);
    }
  });
});
