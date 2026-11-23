import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideQuillConfig } from 'ngx-quill';
import AdminCreate from './admin-create';
import { ADMIN_CONTENT_REPOSITORY } from '../../../../infrastructure/tokens/content-repository.token';
import { ApiUnreachableError } from '../../../../infrastructure/repositories/api-content.repository';
import {
  ADMIN_ERROR_FIXTURES,
  ADMIN_PAGE_FIXTURES,
  createMockAdminRepository
} from '../../../../../mocks/admin.mock';

describe('AdminCreate', () => {
  let fixture: ComponentFixture<AdminCreate>;
  let component: AdminCreate;
  let mockRepo: ReturnType<typeof createMockAdminRepository>;
  let router: Router;

  beforeEach(async () => {
    mockRepo = createMockAdminRepository();
    await TestBed.configureTestingModule({
      imports: [AdminCreate],
      providers: [
        provideRouter([]),
        provideQuillConfig({}),
        { provide: ADMIN_CONTENT_REPOSITORY, useValue: mockRepo }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminCreate);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should call createPage and createUrl through mocked ADMIN_CONTENT_REPOSITORY and navigate on success', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    await component.onSave(ADMIN_PAGE_FIXTURES.payload);

    expect(mockRepo.createPage).toHaveBeenCalledWith(ADMIN_PAGE_FIXTURES.payload);
    expect(mockRepo.createUrl).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalled();
  });

  it('should render an inline error and preserve user input without navigating when API is unreachable during createPage', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    mockRepo.createPage.mockRejectedValueOnce(
      new ApiUnreachableError(ADMIN_ERROR_FIXTURES.unreachableMessage)
    );

    const root = fixture.nativeElement;
    expect(root instanceof HTMLElement).toBe(true);
    if (root instanceof HTMLElement) {
      const titleInput = root.querySelector('input#title');
      expect(titleInput instanceof HTMLInputElement).toBe(true);
      if (titleInput instanceof HTMLInputElement) {
        titleInput.value = ADMIN_PAGE_FIXTURES.payload.title;
        titleInput.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        await component.onSave(ADMIN_PAGE_FIXTURES.payload);
        fixture.detectChanges();

        expect(navigateSpy).not.toHaveBeenCalled();
        expect(titleInput.value).toBe(ADMIN_PAGE_FIXTURES.payload.title);
        const alertBox = root.querySelector('[role="alert"], .error-message');
        expect(alertBox?.textContent).toContain(ADMIN_ERROR_FIXTURES.unreachableMessage);
      }
    }
  });

  it('should render an inline error without navigating when API is unreachable during createUrl', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    mockRepo.createUrl.mockRejectedValueOnce(
      new ApiUnreachableError(ADMIN_ERROR_FIXTURES.unreachableMessage)
    );

    await component.onSave(ADMIN_PAGE_FIXTURES.payload);
    fixture.detectChanges();

    expect(navigateSpy).not.toHaveBeenCalled();
    const root = fixture.nativeElement;
    if (root instanceof HTMLElement) {
      const alertBox = root.querySelector('[role="alert"], .error-message');
      expect(alertBox?.textContent).toContain(ADMIN_ERROR_FIXTURES.unreachableMessage);
    }
  });
});
