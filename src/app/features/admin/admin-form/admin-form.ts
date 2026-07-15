import { Component, inject, input, output, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { AdminService } from '../../../core/services/admin.service';
import { PageType } from '../../../shared/types/page-type.enum';
import { CmsPage } from '../../../shared/types/cms.interface';
import { locationToInt, intToRoman } from '../../../shared/utils/location.utils';
import Quill from 'quill';

const ImageFormat = Quill.import('formats/image') as any;
class CustomImage extends ImageFormat {
  static create(value: any) {
    const node = super.create(value);
    if (typeof value === 'string') {
      node.setAttribute('src', value);
    } else if (typeof value === 'object') {
      node.setAttribute('src', value.url || value.src);
      if (value.alt) node.setAttribute('alt', value.alt);
      if (value.class) node.setAttribute('class', value.class);
      if (value.width) {
        node.setAttribute('width', value.width);
        node.style.width = value.width.endsWith('%') || value.width.endsWith('px') ? value.width : value.width + 'px';
      }
    }
    return node;
  }

  static value(node: HTMLElement) {
    return {
      url: node.getAttribute('src'),
      alt: node.getAttribute('alt'),
      class: node.getAttribute('class'),
      width: node.getAttribute('width')
    };
  }

  format(name: string, value: any) {
    if (['alt', 'class', 'width'].includes(name)) {
      if (value) {
        (this as any).domNode.setAttribute(name, value);
        if (name === 'width') {
           (this as any).domNode.style.width = value.endsWith('%') || value.endsWith('px') ? value : value + 'px';
        }
      } else {
        (this as any).domNode.removeAttribute(name);
        if (name === 'width') (this as any).domNode.style.width = '';
      }
    } else {
      super.format(name, value);
    }
  }
}
Quill.register(CustomImage, true);

@Component({
  selector: 'app-admin-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, QuillModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="admin-form">
      <div class="form-group">
        <label for="title">Title</label>
        <input id="title" type="text" formControlName="title" placeholder="Page title">
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="type">Type</label>
          <select id="type" formControlName="type">
            <option [value]="PageType.Home">Home</option>
            <option [value]="PageType.Chapter">Chapter</option>
            <option [value]="PageType.Exit">Exit</option>
          </select>
        </div>

        <div class="form-group">
          <label for="lang">Language</label>
          <select id="lang" formControlName="lang">
            <option value="pt">Portuguese (PT)</option>
            <option value="en">English (EN)</option>
            <option value="es">Spanish (ES)</option>
            <option value="fr">French (FR)</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="location">Location</label>
          <select id="location" formControlName="location">
            @for (opt of locationOptions(); track opt) {
              <option [value]="opt">{{ opt }}</option>
            }
            <option value="custom">-- Custom / Other --</option>
          </select>
          @if (form.get('location')?.value === 'custom') {
            <input type="text" formControlName="customLocation" placeholder="Enter custom location" style="margin-top: 5px;">
          }
          <small class="form-hint">Swaps positions automatically if location is already taken.</small>
        </div>
      </div>

      <div class="form-group editor-group">
        <label>Content</label>
        <p class="editor-hint">Tip: Click on an image to open the property manager.</p>
        <quill-editor 
          formControlName="content"
          [modules]="quillModules"
          (onEditorCreated)="onEditorCreated($event)"
          placeholder="Write content here...">
        </quill-editor>
      </div>

      <div class="form-actions">
        <button type="button" class="btn-secondary" (click)="onCancel()">Cancel</button>
        <button type="submit" class="btn-primary" [disabled]="form.invalid || isSubmitting()">
          {{ isEdit() ? 'Save Changes' : 'Create Page' }}
        </button>
      </div>
    </form>

    <!-- Image Editing Modal -->
    @if (selectedImage()) {
      <div class="modal-backdrop" (click)="closeImageModal()">
        <div class="image-modal" (click)="$event.stopPropagation()">
          <header class="modal-header">
            <h3>Image Properties</h3>
            <button class="close-x" (click)="closeImageModal()">&times;</button>
          </header>
          
          <div class="modal-body">
            <div class="modal-field">
              <label>Replace File</label>
              <input type="file" (change)="onReplaceFile($event)" accept="image/*" style="border: none; padding: 5px 0;">
            </div>
            
            <div class="modal-field">
              <label>Alternative Text (SEO/Alt)</label>
              <input type="text" [(ngModel)]="imageProps.alt" placeholder="Image description">
            </div>
            
            <div class="modal-field">
              <label>CSS Classes</label>
              <input type="text" [(ngModel)]="imageProps.class" placeholder="e.g.: inline-img cms-image">
            </div>
            
            <div class="modal-field">
              <label>Width</label>
              <div class="quick-sizes">
                <button type="button" (click)="imageProps.width = '25%'">25%</button>
                <button type="button" (click)="imageProps.width = '50%'">50%</button>
                <button type="button" (click)="imageProps.width = '100%'">100%</button>
                <button type="button" (click)="imageProps.width = ''">Auto</button>
              </div>
              <input type="text" [(ngModel)]="imageProps.width" placeholder="e.g.: 100%, 400px or auto">
            </div>

            <div class="modal-field">
              <label>Alignment / Justification</label>
              <div class="alignment-buttons">
                <button type="button" [class.active]="imageProps.align === 'left'" (click)="imageProps.align = 'left'">⬅ Left</button>
                <button type="button" [class.active]="imageProps.align === 'center'" (click)="imageProps.align = 'center'">↔ Center</button>
                <button type="button" [class.active]="imageProps.align === 'right'" (click)="imageProps.align = 'right'">➡ Right</button>
              </div>
            </div>

            <div class="image-preview">
              <img [src]="selectedImage()?.src" style="max-height: 100px; display: block; margin: 10px auto; border-radius: 4px;">
            </div>
          </div>

          <footer class="modal-footer">
            <button class="btn-danger-outline" (click)="deleteSelectedImage()">Delete Image</button>
            <div class="footer-main-actions">
              <button class="btn-secondary" (click)="closeImageModal()">Cancel</button>
              <button class="btn-primary" (click)="saveImageProps()">Apply Changes</button>
            </div>
          </footer>
        </div>
      </div>
    }
  `,
  styles: [`
    .admin-form { display: flex; flex-direction: column; gap: 20px; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .form-row { display: flex; gap: 20px; flex-wrap: wrap; }
    .form-group { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 200px; }
    .editor-hint { font-size: 0.85rem; color: #666; margin-bottom: 5px; }
    label { font-weight: 600; color: #333; }
    .form-hint { font-size: 0.75rem; color: #888; margin-top: 2px; }
    input, select { padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 1rem; }
    .editor-group { min-height: 400px; }
    ::ng-deep .ql-container { min-height: 300px; font-family: inherit; font-size: 1.05rem; }
    ::ng-deep .ql-editor img { cursor: pointer; border: 2px solid transparent; transition: border 0.2s; }
    ::ng-deep .ql-editor img:hover { border: 2px solid #007bff; }
    .form-actions { display: flex; justify-content: flex-end; gap: 15px; margin-top: 20px; }
    button { padding: 12px 24px; border-radius: 4px; font-weight: 600; cursor: pointer; border: none; }
    .btn-primary { background: #007bff; color: white; }
    .btn-primary:disabled { background: #ccc; cursor: not-allowed; }
    .btn-secondary { background: #f8f9fa; color: #333; border: 1px solid #ddd; }
    .btn-danger-outline { background: transparent; color: #dc3545; border: 1px solid #dc3545; }
    .btn-danger-outline:hover { background: #dc3545; color: white; }

    /* Modal Styles */
    .modal-backdrop {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.5); z-index: 100000;
      display: flex; align-items: center; justify-content: center;
    }
    .image-modal {
      background: white; width: 100%; max-width: 500px; border-radius: 8px;
      display: flex; flex-direction: column; box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    }
    .modal-header {
      padding: 15px 20px; border-bottom: 1px solid #eee;
      display: flex; justify-content: space-between; align-items: center;
      h3 { margin: 0; font-size: 1.2rem; color: #2c3e50; }
      .close-x { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #aaa; }
    }
    .modal-body { padding: 20px; display: flex; flex-direction: column; gap: 15px; }
    .modal-field {
      display: flex; flex-direction: column; gap: 5px;
      label { font-size: 0.9rem; color: #555; }
      input { width: 100%; box-sizing: border-box; }
    }
    .modal-footer {
      padding: 15px 20px; border-top: 1px solid #eee;
      display: flex; justify-content: space-between; align-items: center;
    }
    .footer-main-actions { display: flex; gap: 10px; }

    .quick-sizes, .alignment-buttons {
      display: flex; gap: 5px; margin-bottom: 8px;
      button { 
        flex: 1; padding: 6px; font-size: 0.8rem; background: #eee; border: 1px solid #ccc; 
        color: #333; cursor: pointer; border-radius: 4px;
      }
      button:hover { background: #e0e0e0; }
      button.active { background: #007bff; color: white; border-color: #0056b3; }
    }
  `]
})
export class AdminForm implements OnInit {
  private fb = inject(FormBuilder);
  private adminService = inject(AdminService);

  initialData = input<CmsPage | null>(null);
  save = output<any>();
  cancel = output<void>();

  public PageType = PageType;
  public form: FormGroup;
  public isSubmitting = signal(false);
  public isEdit = computed(() => !!this.initialData());
  public locationOptions = signal<string[]>([]);

  public selectedImage = signal<HTMLImageElement | null>(null);
  public imageProps = { alt: '', class: '', width: '', align: '' };
  private activeQuill: any;

  quillModules = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'header': 2 }, { 'header': 3 }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'header': [2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      ['clean'],
      ['link', 'image', 'video']
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

  ngOnInit() {
    if (this.initialData()) {
      const data = this.initialData()!;
      this.form.patchValue({
        title: data.title,
        type: data.type,
        lang: data.lang,
        content: data.content,
        location: data.metadata?.location || ''
      });
    }

    this.updateLocationOptions();

    this.form.get('type')?.valueChanges.subscribe(() => {
      this.updateLocationOptions();
      this.suggestNextLocation();
    });
    this.form.get('lang')?.valueChanges.subscribe(() => {
      this.updateLocationOptions();
      this.suggestNextLocation();
    });
  }

  private async updateLocationOptions() {
    const type = this.form.get('type')?.value;
    const lang = this.form.get('lang')?.value;
    
    let options: string[] = [];
    
    if (type === PageType.Home) {
      options = ['front-cover', 'index', 'preface'];
    } else if (type === PageType.Exit) {
      options = ['about', 'contact-form', 'back-cover'];
    }

    if (lang) {
      try {
        const pages = await this.adminService.getPagesByType(type, lang);
        const existing = pages
          .map(p => p.metadata?.location)
          .filter((l): l is string => !!l && !options.includes(l));
        options.push(...existing);
        
        if (type === PageType.Chapter) {
          let max = 0;
          pages.forEach(p => {
            const n = locationToInt(p.metadata?.location);
            if (n > max) max = n;
          });
          const next = intToRoman(max + 1);
          if (!options.includes(next)) options.push(next);
        }
      } catch (err) {}
    }

    options.sort((a, b) => locationToInt(a) - locationToInt(b));
    this.locationOptions.set(options);
  }

  private async suggestNextLocation() {
    if (this.isEdit()) return;
    
    const type = this.form.get('type')?.value;
    const lang = this.form.get('lang')?.value;

    if (type === PageType.Chapter && lang) {
      try {
        const chapters = await this.adminService.getPagesByType(PageType.Chapter, lang);
        let maxOrder = 0;
        chapters.forEach(c => {
          const order = locationToInt(c.metadata?.location);
          if (order > maxOrder) maxOrder = order;
        });
        
        const nextRoman = intToRoman(maxOrder + 1);
        this.form.patchValue({ location: nextRoman }, { emitEvent: false });
      } catch (err) {
        console.error('Failed to suggest next location', err);
      }
    } else if (type === PageType.Home) {
      if (!this.form.get('location')?.value) {
         this.form.patchValue({ location: 'front-cover' }, { emitEvent: false });
      }
    }
  }

  onEditorCreated(quill: any) {
    this.activeQuill = quill;
    const toolbar = quill.getModule('toolbar');
    toolbar.addHandler('image', () => this.imageHandler(quill));

    quill.root.addEventListener('click', (ev: MouseEvent) => {
      const target = ev.target as HTMLElement;
      if (target && target.tagName === 'IMG') {
        const img = target as HTMLImageElement;
        this.openImageModal(img);
      }
    });
  }

  private openImageModal(img: HTMLImageElement) {
    this.selectedImage.set(img);
    
    let align = '';
    if (img.classList.contains('align-center')) align = 'center';
    else if (img.classList.contains('align-right')) align = 'right';
    else if (img.classList.contains('align-left')) align = 'left';

    this.imageProps = {
      alt: img.getAttribute('alt') || '',
      class: img.getAttribute('class')?.replace(/align-(left|center|right)/g, '').trim() || 'cms-image',
      width: img.getAttribute('width') || '',
      align: align
    };
  }

  public closeImageModal() {
    this.selectedImage.set(null);
  }

  public saveImageProps() {
    const img = this.selectedImage();
    if (img && this.activeQuill) {
      img.setAttribute('alt', this.imageProps.alt);
      img.setAttribute('width', this.imageProps.width);
      
      img.classList.remove('align-left', 'align-center', 'align-right');
      img.style.display = '';
      img.style.marginLeft = '';
      img.style.marginRight = '';

      if (this.imageProps.align === 'center') {
        img.classList.add('align-center');
        img.style.display = 'block';
        img.style.marginLeft = 'auto';
        img.style.marginRight = 'auto';
      } else if (this.imageProps.align === 'right') {
        img.classList.add('align-right');
        img.style.display = 'block';
        img.style.marginLeft = 'auto';
        img.style.marginRight = '0';
      } else if (this.imageProps.align === 'left') {
        img.classList.add('align-left');
        img.style.display = 'block';
        img.style.marginLeft = '0';
        img.style.marginRight = 'auto';
      }

      img.setAttribute('class', this.imageProps.class);
      if (this.imageProps.align) img.classList.add(`align-${this.imageProps.align}`);

      if (this.imageProps.width) {
        img.style.width = this.imageProps.width.endsWith('%') || this.imageProps.width.endsWith('px') 
          ? this.imageProps.width 
          : this.imageProps.width + 'px';
      } else {
        img.style.width = '';
      }

      const blot = Quill.find(img);
      if (blot && (blot as any).format) {
        (blot as any).format('alt', this.imageProps.alt);
        (blot as any).format('class', img.getAttribute('class'));
        (blot as any).format('width', this.imageProps.width);
      }
      
      this.activeQuill.update();
      this.closeImageModal();
    }
  }

  public async onReplaceFile(event: any) {
    const file = event.target.files?.[0];
    const img = this.selectedImage();
    if (file && img) {
      try {
        const record = await this.adminService.uploadImage(file);
        const fileName = (record as any).file;
        const url = this.adminService.getFileUrl(record, fileName);
        
        img.setAttribute('src', url);
        this.activeQuill.update();
      } catch (error) {
        console.error('Failed to replace image', error);
        alert('Error uploading new file.');
      }
    }
  }

  public deleteSelectedImage() {
    const img = this.selectedImage();
    if (img && confirm('Do you want to delete this image?')) {
      const blot = Quill.find(img);
      if (blot) (blot as any).remove();
      this.activeQuill.update();
      this.closeImageModal();
    }
  }

  async imageHandler(quill: any) {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        try {
          const record = await this.adminService.uploadImage(file);
          const fileName = (record as any).file;
          const url = this.adminService.getFileUrl(record, fileName);
          
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'image', url);
          
          const [leaf] = quill.getLeaf(range.index);
          if (leaf && (leaf as any).domNode) {
            const img = (leaf as any).domNode as HTMLImageElement;
            img.classList.add('cms-image');
            img.setAttribute('data-retina', 'true');
            img.setAttribute('loading', 'lazy');
          }
          quill.update();
        } catch (error) {
          console.error('Image upload failed', error);
          alert('Error uploading image.');
        }
      }
    };
  }

  public submit() {
    this.onSubmit();
  }

  async onSubmit() {
    if (this.form.valid) {
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

        const data = {
          title: val.title,
          type: val.type,
          lang: val.lang,
          content: val.content,
          metadata: {
            location: newLocation
          }
        };
        this.save.emit(data);
      } catch (err) {
        console.error('Error during swap or save', err);
        alert('An error occurred while saving.');
      } finally {
        this.isSubmitting.set(false);
      }
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
