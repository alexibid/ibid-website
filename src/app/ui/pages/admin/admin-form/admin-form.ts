import { ChangeDetectionStrategy, Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import Quill from 'quill';
import Toolbar from 'quill/modules/toolbar';
import { AdminFacade } from '../../../../application/facades/admin.facade';
import { LANGUAGE_LABELS, isSupportedLanguage } from '../../../../domain/constants/languages';
import { CmsPage, CmsPagePayload } from '../../../../domain/models/cms.interface';
import { PageType } from '../../../../domain/models/page-type.enum';
import { intToRoman, locationToInt } from '../../../../domain/utils/location.utils';
import { SUPPORTED_LANGUAGES } from '../../../../infrastructure/services/i18n.service';
import { CustomImage, cssWidthOf } from './custom-image';

const ALIGN_MARGINS: Readonly<Record<string, readonly [string, string]>> = {
  left: ['0', 'auto'],
  center: ['auto', 'auto'],
  right: ['auto', '0']
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-admin-form',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, QuillModule],
  templateUrl: './admin-form.html',
  styleUrl: './admin-form.scss'
})
export class AdminForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly adminService = inject(AdminFacade);
  public readonly supportedLanguages = inject(SUPPORTED_LANGUAGES);
  public readonly languageOptions = this.supportedLanguages.map((code) => ({
    code,
    label: isSupportedLanguage(code) ? LANGUAGE_LABELS[code].optionLabel : code.toUpperCase()
  }));

  public readonly initialData = input<CmsPage | null>(null);
  public readonly save = output<CmsPagePayload>();
  public readonly cancel = output<void>();
  public readonly PageType = PageType;
  public readonly form: FormGroup;
  public readonly isSubmitting = signal(false);
  public readonly formError = signal<string | null>(null);
  public readonly modalError = signal<string | null>(null);
  public readonly confirmImageDelete = signal(false);
  public readonly isEdit = computed(() => !!this.initialData());
  public readonly locationOptions = signal<string[]>([]);
  public readonly selectedImage = signal<HTMLImageElement | null>(null);
  public imageProps = { alt: '', class: '', width: '', align: '' };
  private activeQuill: Quill | null = null;
  public readonly quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'], ['blockquote', 'code-block'], [{ header: 2 }, { header: 3 }],
      [{ list: 'ordered' }, { list: 'bullet' }], [{ indent: '-1' }, { indent: '+1' }], [{ size: ['small', false, 'large', 'huge'] }],
      [{ header: [2, 3, 4, 5, 6, false] }], [{ color: [] }, { background: [] }], ['clean'], ['link', 'image', 'video']
    ]
  };

  constructor() {
    this.form = this.fb.group({
      title: ['', Validators.required],
      type: [PageType.Chapter, Validators.required],
      lang: ['pt', Validators.required],
      content: ['', Validators.required],
      location: [''],
      customLocation: ['']
    });
  }

  public ngOnInit(): void {
    const data = this.initialData();
    if (data) {
      this.form.patchValue({
        title: data.title,
        type: data.type,
        lang: data.lang,
        content: data.content,
        location: data.metadata?.location || ''
      });
    }
    void this.updateLocationOptions();
    for (const controlName of ['type', 'lang']) {
      this.form.get(controlName)?.valueChanges.subscribe(() => {
        void this.updateLocationOptions();
        void this.suggestNextLocation();
      });
    }
  }

  private async updateLocationOptions(): Promise<void> {
    const type = String(this.form.get('type')?.value ?? '');
    const lang = String(this.form.get('lang')?.value ?? '');
    const options: string[] = [];
    if (type === PageType.Home) options.push('front-cover', 'index', 'preface');
    else if (type === PageType.Exit) options.push('about', 'contact-form', 'back-cover');
    if (lang) {
      try {
        const pages = await this.adminService.getPagesByType(type, lang);
        const existing = pages
          .map((p) => p.metadata?.location)
          .filter((l): l is string => !!l && !options.includes(l));
        options.push(...existing);
        if (type === PageType.Chapter) {
          const max = pages.reduce((acc, p) => Math.max(acc, locationToInt(p.metadata?.location)), 0);
          const next = intToRoman(max + 1);
          if (!options.includes(next)) options.push(next);
        }
      } catch (err) {
        this.formError.set(this.toErrorMessage(err, 'Failed to load location options.'));
      }
    }
    options.sort((a, b) => locationToInt(a) - locationToInt(b));
    this.locationOptions.set(options);
  }

  private async suggestNextLocation(): Promise<void> {
    if (this.isEdit()) return;
    const type = String(this.form.get('type')?.value ?? '');
    const lang = String(this.form.get('lang')?.value ?? '');
    if (type === PageType.Chapter && lang) {
      try {
        const chapters = await this.adminService.getPagesByType(PageType.Chapter, lang);
        const maxOrder = chapters.reduce((acc, c) => Math.max(acc, locationToInt(c.metadata?.location)), 0);
        this.form.patchValue({ location: intToRoman(maxOrder + 1) }, { emitEvent: false });
      } catch (err) {
        this.formError.set(this.toErrorMessage(err, 'Failed to suggest next location.'));
      }
    } else if (type === PageType.Home && !this.form.get('location')?.value) {
      this.form.patchValue({ location: 'front-cover' }, { emitEvent: false });
    }
  }

  public onEditorCreated(quill: Quill): void {
    this.activeQuill = quill;
    const toolbar = quill.getModule('toolbar');
    if (toolbar instanceof Toolbar) {
      toolbar.addHandler('image', () => this.imageHandler(quill));
    }
    quill.root.addEventListener('click', (ev: MouseEvent) => {
      if (ev.target instanceof HTMLImageElement) {
        this.openImageModal(ev.target);
      }
    });
  }

  private openImageModal(img: HTMLImageElement): void {
    this.modalError.set(null);
    this.confirmImageDelete.set(false);
    this.selectedImage.set(img);
    const align = ['center', 'right', 'left'].find((side) => img.classList.contains(`align-${side}`)) ?? '';
    this.imageProps = {
      alt: img.getAttribute('alt') || '',
      class: img.getAttribute('class')?.replace(/align-(left|center|right)/g, '').trim() || 'cms-image',
      width: img.getAttribute('width') || '',
      align
    };
  }

  public closeImageModal(): void {
    this.modalError.set(null);
    this.confirmImageDelete.set(false);
    this.selectedImage.set(null);
  }

  public saveImageProps(): void {
    const img = this.selectedImage();
    if (!img || !this.activeQuill) return;
    img.setAttribute('alt', this.imageProps.alt);
    img.setAttribute('width', this.imageProps.width);
    img.setAttribute('class', this.imageProps.class);
    const margins = ALIGN_MARGINS[this.imageProps.align];
    img.style.display = margins ? 'block' : '';
    img.style.marginLeft = margins ? margins[0] : '';
    img.style.marginRight = margins ? margins[1] : '';
    if (margins) img.classList.add(`align-${this.imageProps.align}`);
    img.style.width = this.imageProps.width ? cssWidthOf(this.imageProps.width) : '';
    const blot = Quill.find(img);
    if (blot instanceof CustomImage) {
      blot.format('alt', this.imageProps.alt);
      blot.format('class', img.getAttribute('class') ?? '');
      blot.format('width', this.imageProps.width);
    }
    this.activeQuill.update();
    this.closeImageModal();
  }

  public async onReplaceFile(event: Event): Promise<void> {
    if (!(event.target instanceof HTMLInputElement)) return;
    const file = event.target.files?.[0];
    const img = this.selectedImage();
    if (!file || !img) return;
    this.modalError.set(null);
    try {
      const url = await this.adminService.uploadImageUrl(file);
      img.setAttribute('src', url);
      this.activeQuill?.update();
    } catch (err) {
      this.modalError.set(this.toErrorMessage(err, 'Error uploading replacement image.'));
    }
  }

  public requestDeleteImage(): void { this.confirmImageDelete.set(true); }
  public cancelDeleteImage(): void { this.confirmImageDelete.set(false); }
  public submit(): void { void this.onSubmit(); }
  public onCancel(): void { this.cancel.emit(); }

  public deleteSelectedImage(): void {
    const img = this.selectedImage();
    if (!img) return;
    const blot = Quill.find(img);
    if (blot instanceof CustomImage) blot.remove();
    this.activeQuill?.update();
    this.closeImageModal();
  }

  public triggerImageUpload(type: 'landscape' | 'feature'): void {
    if (!this.activeQuill) return;
    const imageClass = type === 'feature' ? 'cms-image img-feature' : 'cms-image img-landscape-a';
    this.pickAndInsertImage(this.activeQuill, imageClass);
  }

  public imageHandler(quill: Quill): void {
    this.pickAndInsertImage(quill, 'cms-image');
  }

  private pickAndInsertImage(quill: Quill, imageClass: string): void {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      this.formError.set(null);
      try {
        const url = await this.adminService.uploadImageUrl(file);
        const range = quill.getSelection(true);
        quill.insertEmbed(range.index, 'image', url);
        const [leaf] = quill.getLeaf(range.index);
        if (leaf instanceof CustomImage) {
          const img = leaf.domNode;
          img.setAttribute('class', imageClass);
          img.setAttribute('data-retina', 'true');
          img.setAttribute('loading', 'lazy');
        }
        quill.update();
      } catch (err) {
        this.formError.set(this.toErrorMessage(err, 'Error uploading image.'));
      }
    };
  }

  public async onSubmit(): Promise<void> {
    if (!this.form.valid) return;
    this.formError.set(null);
    this.isSubmitting.set(true);
    const val = this.form.value;
    const newLocation = val.location === 'custom' ? val.customLocation : val.location;
    const oldLocation = this.initialData()?.metadata?.location;
    try {
      if (this.isEdit() && newLocation && newLocation !== oldLocation) {
        const targetPage = await this.adminService.getPageByLocation(val.type, val.lang, newLocation);
        if (targetPage && targetPage.id !== this.initialData()?.id) {
          await this.adminService.updatePage(targetPage.id, {
            metadata: { ...targetPage.metadata, location: oldLocation || '' }
          });
        }
      }
      this.save.emit({
        title: val.title,
        type: val.type,
        lang: val.lang,
        content: val.content,
        metadata: { location: newLocation }
      });
    } catch (err) {
      this.formError.set(this.toErrorMessage(err, 'An error occurred while saving.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private toErrorMessage(err: unknown, fallback: string): string {
    return err instanceof Error && err.message ? err.message : fallback;
  }
}
