import { Component, AfterViewInit, OnDestroy, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Cover } from '../../shared/components/cover/cover';
import { PocketbaseService } from '../../core/services/pocketbase.service';
import { I18nService } from '../../core/services/i18n.service';
import { PageType } from '../../core/models/page-type.enum';
import { BasePage } from '../../core/base/base-page';

@Component({
  selector: 'app-exit',
  standalone: true,
  imports: [CommonModule, Cover],
  templateUrl: './exit.html',
  styleUrl: './exit.scss',
})
export class Exit extends BasePage implements AfterViewInit, OnDestroy {
  private readonly pbService = inject(PocketbaseService);
  private readonly i18n = inject(I18nService);

  protected readonly exitSections = signal<any[]>([]);
  protected anchorTarget = '';

  constructor() {
    super();
    effect(() => this.loadAllExitSections(this.i18n.currentLangCode()));
    this.route.data.subscribe((data) => {
      if (data && data['location']) {
        this.anchorTarget = data['location'];
        this.triggerScroll();
      }
    });
  }

  private async loadAllExitSections(lang: string) {
    try {
      const records = await this.pbService.pb.collection('pages').getFullList({
        filter: `type = '${PageType.Exit}' && lang = '${lang}'`
      });
      
      const structuralOrder = ['contact-form', 'about', 'back-cover'];
      records.sort((a, b) => {
        const locA = a['metadata']?.['location'];
        const locB = b['metadata']?.['location'];
        const orderA = structuralOrder.indexOf(locA) !== -1 ? structuralOrder.indexOf(locA) : 99;
        const orderB = structuralOrder.indexOf(locB) !== -1 ? structuralOrder.indexOf(locB) : 99;
        return orderA - orderB;
      });
      
      this.exitSections.set(records);
      setTimeout(() => {
        this.measurePage();
        this.triggerScroll();
      }, 100);
    } catch (e) {
      console.error('Failed to load exit sections', e);
    }
  }

  private triggerScroll() {
    if (!this.isBrowser || !this.anchorTarget) return;
    setTimeout(() => {
      const el = document.getElementById(this.anchorTarget);
      if (el) {
        this.hostEl.scrollTo({ left: el.offsetLeft, behavior: 'instant' });
        this.updateCurrentPage();
      }
    }, 50);
  }

  public onSubmit(event: Event) {
    event.preventDefault();
    this.hostEl.scrollTo({ left: this.hostEl.scrollWidth, behavior: 'smooth' });
  }

  override ngAfterViewInit() {
    this.bookService.activeChapterSlug.set(this.currentSlug);
    super.ngAfterViewInit();
  }
}
