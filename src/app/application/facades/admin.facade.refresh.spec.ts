import { TestBed } from '@angular/core/testing';
import { AdminFacade } from './admin.facade';
import { RoutingService } from '../../infrastructure/services/routing.service';
import { ADMIN_CONTENT_REPOSITORY } from '../../infrastructure/tokens/content-repository.token';
import {
  ADMIN_PAGE_FIXTURES,
  createMockAdminRepository
} from '../../../mocks/admin.mock';

function firstCall(mock: { mock: { invocationCallOrder: number[] } }): number {
  return mock.mock.invocationCallOrder[0];
}

describe('AdminFacade route refresh after saving', () => {
  let facade: AdminFacade;
  let repository: ReturnType<typeof createMockAdminRepository>;
  let refreshRoutes: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repository = createMockAdminRepository();
    refreshRoutes = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: ADMIN_CONTENT_REPOSITORY, useValue: repository },
        { provide: RoutingService, useValue: { refreshRoutes } }
      ]
    });
    facade = TestBed.inject(AdminFacade);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should refresh the routes after updatePage so the next visit shows the new content', async () => {
    await facade.updatePage(ADMIN_PAGE_FIXTURES.primaryPage.id, ADMIN_PAGE_FIXTURES.payload);

    expect(refreshRoutes).toHaveBeenCalledTimes(1);
    expect(firstCall(repository.updatePage)).toBeLessThan(firstCall(refreshRoutes));
  });

  it('should wait for the refresh before returning the saved result', async () => {
    let finished = false;
    refreshRoutes.mockImplementation(async () => {
      await Promise.resolve();
      finished = true;
    });

    await facade.updatePage(ADMIN_PAGE_FIXTURES.primaryPage.id, ADMIN_PAGE_FIXTURES.payload);

    expect(finished).toBe(true);
  });

  it('should not refresh and should report the failure when the save fails', async () => {
    repository.updatePage.mockRejectedValueOnce(new Error('save failed'));

    await expect(
      facade.updatePage(ADMIN_PAGE_FIXTURES.primaryPage.id, ADMIN_PAGE_FIXTURES.payload)
    ).rejects.toThrow('save failed');

    expect(refreshRoutes).not.toHaveBeenCalled();
    expect(facade.error()).toBe('save failed');
  });

  it('should keep a successful save successful when the refresh fails', async () => {
    refreshRoutes.mockRejectedValue(new Error('refresh failed'));

    const saved = await facade.updatePage(
      ADMIN_PAGE_FIXTURES.primaryPage.id,
      ADMIN_PAGE_FIXTURES.payload
    );

    expect(saved.id).toBe(ADMIN_PAGE_FIXTURES.primaryPage.id);
    expect(facade.error()).toBeNull();
  });
});
