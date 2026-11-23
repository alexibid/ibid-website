import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideQuillConfig } from 'ngx-quill';
import { AdminFacade } from '../../../../application/facades/admin.facade';
import { ApiUnreachableError } from '../../../../infrastructure/repositories/api-content.repository';
import { ADMIN_CONTENT_REPOSITORY } from '../../../../infrastructure/tokens/content-repository.token';
import { AdminForm } from './admin-form';
import { MOCK_I18N_PAGES } from '../../../../../mocks/i18n.mock';
import {
  ADMIN_ERROR_FIXTURES,
  ADMIN_MEDIA_FIXTURES,
  createMockAdminRepository
} from '../../../../../mocks/admin.mock';

describe('AdminForm', () => {
  let fixture: ComponentFixture<AdminForm>;
  let component: AdminForm;
  let mockRepo: ReturnType<typeof createMockAdminRepository>;

  beforeEach(async () => {
    mockRepo = createMockAdminRepository();
    await TestBed.configureTestingModule({
      imports: [AdminForm],
      providers: [
        provideQuillConfig({}),
        { provide: ADMIN_CONTENT_REPOSITORY, useValue: mockRepo }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('should mark language control invalid when empty and preserve de or fr initial data', () => {
    component.form.get('lang')?.setValue('');
    expect(component.form.get('lang')?.valid).toBe(false);

    const germanPage = MOCK_I18N_PAGES.find((page) => page.lang === 'de');
    expect(germanPage).toBeDefined();
    if (germanPage) {
      fixture.componentRef.setInput('initialData', germanPage);
      component.ngOnInit();
      fixture.detectChanges();
      expect(component.form.get('lang')?.value).toBe('de');
    }

    const frenchPage = MOCK_I18N_PAGES.find((page) => page.lang === 'fr');
    expect(frenchPage).toBeDefined();
    if (frenchPage) {
      fixture.componentRef.setInput('initialData', frenchPage);
      component.ngOnInit();
      fixture.detectChanges();
      expect(component.form.get('lang')?.value).toBe('fr');
    }
  });

  it('should upload replacement media via AdminFacade.uploadImageUrl and ADMIN_CONTENT_REPOSITORY.uploadImage in onReplaceFile', async () => {
    const facade = TestBed.inject(AdminFacade);
    const facadeSpy = vi.spyOn(facade, 'uploadImageUrl');
    const samplePage = MOCK_I18N_PAGES[0];
    const expectedLocation = samplePage.metadata?.location ?? '';
    component.form.patchValue(
      {
        title: samplePage.title,
        type: samplePage.type,
        lang: samplePage.lang,
        content: samplePage.content,
        location: expectedLocation
      },
      { emitEvent: false }
    );

    const img = document.createElement('img');
    component.selectedImage.set(img);

    const file = ADMIN_MEDIA_FIXTURES.createImageFile();
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
    const changeEvent = new Event('change');
    Object.defineProperty(changeEvent, 'target', { value: fileInput, configurable: true });

    await component.onReplaceFile(changeEvent);

    expect(facadeSpy).toHaveBeenCalledWith(file);
    expect(mockRepo.uploadImage).toHaveBeenCalledWith(file);
    expect(img.getAttribute('src')).toBe(ADMIN_MEDIA_FIXTURES.uploadUrl);
    expect(component.modalError()).toBeNull();

    mockRepo.uploadImage.mockRejectedValueOnce(
      new ApiUnreachableError(ADMIN_ERROR_FIXTURES.unreachableMessage)
    );
    await component.onReplaceFile(changeEvent);
    fixture.detectChanges();

    expect(component.modalError()).toContain(ADMIN_ERROR_FIXTURES.unreachableMessage);
    const root = fixture.nativeElement;
    expect(root instanceof HTMLElement).toBe(true);
    if (root instanceof HTMLElement) {
      const modalAlert = root.querySelector('.image-modal .error-message[role="alert"]');
      expect(modalAlert).not.toBeNull();
      expect(modalAlert?.textContent).toContain(ADMIN_ERROR_FIXTURES.unreachableMessage);
    }
    expect(component.form.get('title')?.value).toBe(samplePage.title);
    expect(component.form.get('type')?.value).toBe(samplePage.type);
    expect(component.form.get('lang')?.value).toBe(samplePage.lang);
    expect(component.form.get('content')?.value).toBe(samplePage.content);
    expect(component.form.get('location')?.value).toBe(expectedLocation);
  });

  it('should upload and embed media on triggerImageUpload and display inline formError without clearing form values when upload fails', async () => {
    const facade = TestBed.inject(AdminFacade);
    const facadeSpy = vi.spyOn(facade, 'uploadImageUrl');
    const quillMock = ADMIN_MEDIA_FIXTURES.createMockQuill();
    component.onEditorCreated(quillMock.editor);

    const samplePage = MOCK_I18N_PAGES[0];
    const expectedLocation = samplePage.metadata?.location ?? '';
    component.form.patchValue(
      {
        title: samplePage.title,
        type: samplePage.type,
        lang: samplePage.lang,
        content: samplePage.content,
        location: expectedLocation
      },
      { emitEvent: false }
    );

    const successInput = document.createElement('input');
    const file = ADMIN_MEDIA_FIXTURES.createImageFile();
    Object.defineProperty(successInput, 'files', { value: [file], configurable: true });
    vi.spyOn(successInput, 'click').mockImplementation(() => {});

    const originalCreateElement = document.createElement.bind(document);
    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) =>
      tagName === 'input' ? successInput : originalCreateElement(tagName)
    );

    component.triggerImageUpload('landscape');
    createElementSpy.mockRestore();

    if (successInput.onchange) {
      await successInput.onchange.call(successInput, new Event('change'));
    }

    expect(facadeSpy).toHaveBeenCalledWith(file);
    expect(mockRepo.uploadImage).toHaveBeenCalledWith(file);
    expect(quillMock.insertEmbed).toHaveBeenCalledWith(0, 'image', ADMIN_MEDIA_FIXTURES.uploadUrl);
    expect(component.formError()).toBeNull();

    mockRepo.uploadImage.mockRejectedValueOnce(
      new ApiUnreachableError(ADMIN_ERROR_FIXTURES.unreachableMessage)
    );

    const failingInput = document.createElement('input');
    Object.defineProperty(failingInput, 'files', { value: [file], configurable: true });
    vi.spyOn(failingInput, 'click').mockImplementation(() => {});
    const failCreateSpy = vi.spyOn(document, 'createElement').mockImplementation((tagName: string) =>
      tagName === 'input' ? failingInput : originalCreateElement(tagName)
    );

    component.triggerImageUpload('feature');
    failCreateSpy.mockRestore();

    if (failingInput.onchange) {
      await failingInput.onchange.call(failingInput, new Event('change'));
    }
    fixture.detectChanges();

    expect(component.formError()).toContain(ADMIN_ERROR_FIXTURES.unreachableMessage);
    expect(component.form.get('title')?.value).toBe(samplePage.title);
    expect(component.form.get('type')?.value).toBe(samplePage.type);
    expect(component.form.get('lang')?.value).toBe(samplePage.lang);
    expect(component.form.get('content')?.value).toBe(samplePage.content);
    expect(component.form.get('location')?.value).toBe(expectedLocation);

    const root = fixture.nativeElement;
    expect(root instanceof HTMLElement).toBe(true);
    if (root instanceof HTMLElement) {
      const alertBox = root.querySelector('.error-message[role="alert"]');
      expect(alertBox).not.toBeNull();
      expect(alertBox?.textContent).toContain(ADMIN_ERROR_FIXTURES.unreachableMessage);
    }
  });

  it('should display inline formError and preserve form controls when submit fails', async () => {
    const initialPage = MOCK_I18N_PAGES[5];
    const targetPage = MOCK_I18N_PAGES[0];
    const nextLocation = targetPage.metadata?.location ?? '';
    fixture.componentRef.setInput('initialData', initialPage);
    component.ngOnInit();
    fixture.detectChanges();

    component.form.patchValue(
      {
        title: targetPage.title,
        type: initialPage.type,
        lang: initialPage.lang,
        content: targetPage.content,
        location: nextLocation
      },
      { emitEvent: false }
    );

    const saveSpy = vi.spyOn(component.save, 'emit');
    mockRepo.getPages.mockRejectedValueOnce(
      new ApiUnreachableError(ADMIN_ERROR_FIXTURES.unreachableMessage)
    );

    await component.onSubmit();
    fixture.detectChanges();

    expect(saveSpy).not.toHaveBeenCalled();
    expect(component.isSubmitting()).toBe(false);
    expect(component.formError()).toContain(ADMIN_ERROR_FIXTURES.unreachableMessage);
    expect(component.form.get('title')?.value).toBe(targetPage.title);
    expect(component.form.get('type')?.value).toBe(initialPage.type);
    expect(component.form.get('lang')?.value).toBe(initialPage.lang);
    expect(component.form.get('content')?.value).toBe(targetPage.content);
    expect(component.form.get('location')?.value).toBe(nextLocation);

    const root = fixture.nativeElement;
    expect(root instanceof HTMLElement).toBe(true);
    if (root instanceof HTMLElement) {
      const alertBox = root.querySelector('.error-message[role="alert"]');
      expect(alertBox).not.toBeNull();
      expect(alertBox?.textContent).toContain(ADMIN_ERROR_FIXTURES.unreachableMessage);
    }
  });
});
