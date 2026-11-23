import { TestBed } from '@angular/core/testing';
import { AdminFacade } from './admin.facade';
import { RoutingService } from '../../infrastructure/services/routing.service';
import { PageType } from '../../domain/models/page-type.enum';
import { ADMIN_CONTENT_REPOSITORY } from '../../infrastructure/tokens/content-repository.token';
import { ApiUnreachableError } from '../../infrastructure/repositories/api-content.repository';
import {
  ADMIN_ERROR_FIXTURES,
  ADMIN_PAGE_FIXTURES,
  ADMIN_URL_FIXTURES,
  createMockAdminRepository
} from '../../../mocks/admin.mock';

describe('AdminFacade', () => {
  let facade: AdminFacade;
  let mockRepo: ReturnType<typeof createMockAdminRepository>;

  beforeEach(() => {
    mockRepo = createMockAdminRepository();
    TestBed.configureTestingModule({
      providers: [
        AdminFacade,
        { provide: ADMIN_CONTENT_REPOSITORY, useValue: mockRepo },
        { provide: RoutingService, useValue: { refreshRoutes: vi.fn().mockResolvedValue(undefined) } }
      ]
    });
    facade = TestBed.inject(AdminFacade);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should load urls from ADMIN_CONTENT_REPOSITORY, populate allUrls, and clear error and isLoading', async () => {
    await facade.loadUrls();

    expect(mockRepo.getUrls).toHaveBeenCalledTimes(1);
    expect(facade.allUrls()).toEqual(ADMIN_URL_FIXTURES.urls);
    expect(facade.isLoading()).toBe(false);
    expect(facade.error()).toBeNull();

    mockRepo.getUrls.mockResolvedValueOnce(ADMIN_URL_FIXTURES.emptyUrls);
    await facade.loadUrls();
    expect(facade.allUrls()).toEqual([]);
  });

  it('should support getUrls, getPage, getPagesByType, getPageByLocation, and clearError ', async () => {
    const urls = await facade.getUrls();
    expect(urls).toEqual(ADMIN_URL_FIXTURES.urls);

    const page = await facade.getPage(ADMIN_PAGE_FIXTURES.primaryPage.id);
    expect(page).toEqual(ADMIN_PAGE_FIXTURES.primaryPage);

    const ptChapters = await facade.getPagesByType(PageType.Chapter, 'pt');
    expect(mockRepo.getPages).toHaveBeenCalledWith({ type: PageType.Chapter, lang: 'pt' });
    expect(ptChapters).toEqual([ADMIN_PAGE_FIXTURES.primaryPage]);

    const matchedByLocation = await facade.getPageByLocation(PageType.Chapter, 'pt', 'preface');
    expect(matchedByLocation).toEqual(ADMIN_PAGE_FIXTURES.primaryPage);

    const missingByLocation = await facade.getPageByLocation(
      PageType.Chapter,
      'pt',
      ADMIN_PAGE_FIXTURES.unknownLocation
    );
    expect(missingByLocation).toBeNull();

    mockRepo.getUrls.mockRejectedValueOnce(
      new ApiUnreachableError(ADMIN_ERROR_FIXTURES.unreachableMessage)
    );
    await facade.loadUrls();
    expect(facade.error()).toBeTruthy();

    facade.clearError();
    expect(facade.error()).toBeNull();
  });

  it('should set error() signal cleanly and reset isLoading when API is unreachable during loadUrls', async () => {
    mockRepo.getUrls.mockRejectedValueOnce(
      new ApiUnreachableError(ADMIN_ERROR_FIXTURES.unreachableMessage)
    );

    await facade.loadUrls();

    expect(facade.isLoading()).toBe(false);
    expect(facade.error()).toBeTruthy();
    expect(facade.error()).toContain(ADMIN_ERROR_FIXTURES.unreachableMessage);
  });

  it('should set error() signal cleanly when API is unreachable during createUrl or deleteUrl', async () => {
    mockRepo.createUrl.mockRejectedValueOnce(
      new ApiUnreachableError(ADMIN_ERROR_FIXTURES.unreachableMessage)
    );
    try {
      await facade.createUrl(ADMIN_URL_FIXTURES.createPayload);
    } catch {}
    expect(facade.error()).toBeTruthy();

    mockRepo.deleteUrl.mockRejectedValueOnce(
      new ApiUnreachableError(ADMIN_ERROR_FIXTURES.unreachableMessage)
    );
    try {
      await facade.deleteUrl(ADMIN_URL_FIXTURES.primaryUrl.id);
    } catch {}
    expect(facade.error()).toBeTruthy();
  });
});
