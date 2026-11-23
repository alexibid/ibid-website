import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { provideQuillConfig } from 'ngx-quill';
import AdminUpdate from './admin-update';
import { ADMIN_CONTENT_REPOSITORY } from '../../../../infrastructure/tokens/content-repository.token';
import { ApiUnreachableError } from '../../../../infrastructure/repositories/api-content.repository';
import {
  ADMIN_ERROR_FIXTURES,
  ADMIN_PAGE_FIXTURES,
  createMockAdminRepository
} from '../../../../../mocks/admin.mock';

describe('AdminUpdate', () => {
  let fixture: ComponentFixture<AdminUpdate>;
  let component: AdminUpdate;
  let mockRepo: ReturnType<typeof createMockAdminRepository>;
  let router: Router;

  beforeEach(async () => {
    mockRepo = createMockAdminRepository();
    await TestBed.configureTestingModule({
      imports: [AdminUpdate],
      providers: [
        provideRouter([]),
        provideQuillConfig({}),
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

    fixture = TestBed.createComponent(AdminUpdate);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should load existing page via ADMIN_CONTENT_REPOSITORY and call updatePage on save', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    expect(mockRepo.getPage).toHaveBeenCalledWith(ADMIN_PAGE_FIXTURES.primaryPage.id);

    await component.onSave(ADMIN_PAGE_FIXTURES.payload);

    expect(mockRepo.updatePage).toHaveBeenCalledWith(
      ADMIN_PAGE_FIXTURES.primaryPage.id,
      ADMIN_PAGE_FIXTURES.payload
    );
    expect(navigateSpy).toHaveBeenCalled();
  });

  it('should report an inline error and preserve edited input when API is unreachable during updatePage', async () => {
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    mockRepo.updatePage.mockRejectedValueOnce(
      new ApiUnreachableError(ADMIN_ERROR_FIXTURES.unreachableMessage)
    );

    const root = fixture.nativeElement;
    expect(root instanceof HTMLElement).toBe(true);
    if (root instanceof HTMLElement) {
      const titleInput = root.querySelector('input#title');
      expect(titleInput instanceof HTMLInputElement).toBe(true);
      if (titleInput instanceof HTMLInputElement) {
        titleInput.value = ADMIN_PAGE_FIXTURES.updatedPage.title;
        titleInput.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        await component.onSave(ADMIN_PAGE_FIXTURES.payload);
        fixture.detectChanges();

        expect(navigateSpy).not.toHaveBeenCalled();
        expect(component.isSaving()).toBe(false);
        expect(titleInput.value).toBe(ADMIN_PAGE_FIXTURES.updatedPage.title);
        const alertBox = root.querySelector('[role="alert"], .error-message');
        expect(alertBox?.textContent).toContain(ADMIN_ERROR_FIXTURES.unreachableMessage);
      }
    }
  });

  it('should report an inline error when loading page details fails because API is unreachable', async () => {
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
