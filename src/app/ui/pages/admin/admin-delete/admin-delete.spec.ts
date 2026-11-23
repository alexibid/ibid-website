import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import AdminDelete from './admin-delete';
import { ADMIN_CONTENT_REPOSITORY } from '../../../../infrastructure/tokens/content-repository.token';
import { ApiUnreachableError } from '../../../../infrastructure/repositories/api-content.repository';
import {
  ADMIN_ERROR_FIXTURES,
  ADMIN_PAGE_FIXTURES,
  createMockAdminRepository
} from '../../../../../mocks/admin.mock';

describe('AdminDelete', () => {
  let fixture: ComponentFixture<AdminDelete>;
  let component: AdminDelete;
  let mockRepo: ReturnType<typeof createMockAdminRepository>;
  let router: Router;

  beforeEach(async () => {
    mockRepo = createMockAdminRepository();
    await TestBed.configureTestingModule({
      imports: [AdminDelete],
      providers: [
        provideRouter([]),
        { provide: ADMIN_CONTENT_REPOSITORY, useValue: mockRepo },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: ADMIN_PAGE_FIXTURES.primaryPage.id })
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminDelete);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should load target page and call deletePage through mocked ADMIN_CONTENT_REPOSITORY on confirm', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    expect(mockRepo.getPage).toHaveBeenCalledWith(ADMIN_PAGE_FIXTURES.primaryPage.id);

    await component.onDelete();

    expect(mockRepo.deletePage).toHaveBeenCalledWith(ADMIN_PAGE_FIXTURES.primaryPage.id);
    expect(navigateSpy).toHaveBeenCalled();
  });

  it('should report an inline error without navigating and keep confirmation visible when API is unreachable on delete', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    mockRepo.deletePage.mockRejectedValueOnce(
      new ApiUnreachableError(ADMIN_ERROR_FIXTURES.unreachableMessage)
    );

    await component.onDelete();
    fixture.detectChanges();

    expect(navigateSpy).not.toHaveBeenCalled();
    const root = fixture.nativeElement;
    expect(root instanceof HTMLElement).toBe(true);
    if (root instanceof HTMLElement) {
      const alertBox = root.querySelector('[role="alert"], .error-message');
      expect(alertBox?.textContent).toContain(ADMIN_ERROR_FIXTURES.unreachableMessage);
      expect(root.querySelector('button.btn-danger')).toBeTruthy();
    }
  });

  it('should report an inline error when loading target page fails because API is unreachable', async () => {
    mockRepo.getPage.mockRejectedValueOnce(
      new ApiUnreachableError(ADMIN_ERROR_FIXTURES.unreachableMessage)
    );

    await component.ngOnInit();
    fixture.detectChanges();

    const root = fixture.nativeElement;
    if (root instanceof HTMLElement) {
      const alertBox = root.querySelector('[role="alert"], .error-message');
      expect(alertBox?.textContent).toContain(ADMIN_ERROR_FIXTURES.unreachableMessage);
    }
  });
});
