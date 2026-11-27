import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  input,
  viewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cover } from '../../components/cover/cover';
import { BookNavigationDirective } from '../../directives/book-navigation.directive';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { StaticHtmlDirective } from '../../directives/static-html.directive';
import { ContactFacade } from '../../../application/facades/contact.facade';
import type { ContactFieldName } from '../../../domain/models/contact.model';
import { estimateChapterPageCount } from '../chapter/chapter';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-exit',
  standalone: true,
  imports: [CommonModule, Cover, TranslatePipe, StaticHtmlDirective],
  templateUrl: './exit.html',
  hostDirectives: [{
    directive: BookNavigationDirective,
    outputs: ['pageMeasured']
  }],
  host: {
    class: 'book-page exit',
    '(pageMeasured)': 'onPageMeasured($event)'
  }
})
export class Exit implements OnInit {
  public readonly lang = input<string>();
  public readonly facade = inject(ContactFacade);
  private readonly nav = inject(BookNavigationDirective);
  private readonly destroyRef = inject(DestroyRef);

  private readonly nameField = viewChild<ElementRef<HTMLInputElement>>('nameField');
  private readonly emailField = viewChild<ElementRef<HTMLInputElement>>('emailField');
  private readonly messageField = viewChild<ElementRef<HTMLTextAreaElement>>('messageField');
  private readonly confirmationBanner = viewChild<ElementRef<HTMLElement>>('confirmationBanner');

  protected readonly needsBlankPage = this.nav.needsBlankPage.asReadonly();
  protected readonly hasBanner = computed(
    () =>
      this.facade.submitStatus() === 'success' ||
      (this.facade.submitStatus() === 'error' && this.facade.errorMessage().length > 0)
  );
  private destroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.facade.cancelPendingSubmission();
    });

    effect(() => {
      const inputLang = this.lang();
      if (inputLang) {
        this.facade.setLanguage(inputLang);
      }
    });

    effect(() => {
      const lang = this.lang() || this.facade.currentLang();
      void this.facade.loadExitSections(lang);
    });

    effect(() => {
      const order = this.facade.dynamicRouteOrder();
      const sections = this.facade.sections();
      this.facade.isDesktop();
      if (order.length > 0 && sections.length > 0 && this.facade.isBrowser) {
        void this.facade.syncBookPagination(this.nav.hostEl, estimateChapterPageCount);
      }
    });

    effect((onCleanup) => {
      const sections = this.facade.sections();
      if (sections.length > 0 && this.facade.isBrowser) {
        this.nav.resetBlankPage();
        const timerId = setTimeout(() => {
          if (!this.nav.hasFragment) {
            this.nav.scrollToStart();
          } else {
            this.nav.triggerScroll();
          }
          this.nav.measurePage();
        }, 100);
        onCleanup(() => clearTimeout(timerId));
      }
    });

    effect((onCleanup) => {
      const sections = this.facade.sections();
      this.facade.errors();
      this.facade.submitStatus();
      this.facade.errorMessage();
      this.lang();
      this.facade.currentLang();
      this.facade.isDesktop();
      if (sections.length > 0 && this.facade.isBrowser) {
        const rafId = requestAnimationFrame(() => this.nav.measurePage());
        onCleanup(() => cancelAnimationFrame(rafId));
      }
    });

    let lastFocusedBanner: HTMLElement | undefined;
    effect(() => {
      const submitStatus = this.facade.submitStatus();
      const banner = this.confirmationBanner()?.nativeElement;
      if (!banner) {
        lastFocusedBanner = undefined;
        return;
      }
      if (submitStatus === 'success' && this.facade.isBrowser && banner !== lastFocusedBanner) {
        lastFocusedBanner = banner;
        this.focusElement(banner);
      }
    });
  }

  ngOnInit(): void {
    this.facade.initAntiSpam();
  }

  protected onPageMeasured(totalCols: number): void {
    this.facade.setPageCount(this.nav.currentSlug, totalCols);
    void this.facade.syncBookPagination(this.nav.hostEl, estimateChapterPageCount);
  }

  protected updateField(field: ContactFieldName | 'honeypot', event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      return;
    }
    if (field === 'honeypot') {
      this.facade.updateHoneypot(target.value);
      return;
    }
    this.facade.updateField(field, target.value);
  }

  protected onFieldBlur(field: ContactFieldName): void {
    this.facade.blurField(field);
  }

  protected onSendAnother(): void {
    this.facade.resetSubmission();
    this.focusField('name');
  }

  public async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.facade.isSubmitting()) {
      return;
    }
    const success = await this.facade.submit();
    if (this.destroyed || success) {
      return;
    }
    const invalidField = this.facade.firstInvalidField();
    if (invalidField !== null) {
      this.focusField(invalidField);
    }
  }

  private getFieldElement(
    field: ContactFieldName
  ): HTMLInputElement | HTMLTextAreaElement | undefined {
    if (field === 'name') {
      return this.nameField()?.nativeElement;
    }
    if (field === 'email') {
      return this.emailField()?.nativeElement;
    }
    return this.messageField()?.nativeElement;
  }

  private focusField(field: ContactFieldName): void {
    this.focusElement(this.getFieldElement(field));
  }

  private focusElement(element: HTMLElement | undefined): void {
    if (!element || !this.facade.isBrowser) {
      return;
    }
    const hostEl = this.nav.hostEl;
    const viewportWidth = hostEl.clientWidth;
    if (viewportWidth > 0) {
      const hostRect = hostEl.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const hasLayoutMetrics = hostRect.width > 0 && elementRect.width > 0;
      const elementLeft = hasLayoutMetrics
        ? elementRect.left - hostRect.left + hostEl.scrollLeft
        : element.offsetLeft;
      const targetScroll = Math.max(0, Math.floor(elementLeft / viewportWidth) * viewportWidth);
      if (Math.abs(targetScroll - hostEl.scrollLeft) > 1) {
        if (typeof hostEl.scrollTo === 'function') {
          hostEl.scrollTo({ left: targetScroll, behavior: 'instant' });
        }
        this.nav.updateCurrentPage();
      }
    }
    element.focus({ preventScroll: true });
  }
}
