import { Component, AfterViewInit, OnDestroy, signal, effect, inject } from '@angular/core';
import { Cover } from '../../shared/components/cover/cover';
import { PocketbaseService } from '../../core/services/pocketbase.service';
import { I18nService } from '../../core/services/i18n.service';
import { PageType } from '../../core/models/page-type.enum';
import { BasePage } from '../../core/base/base-page';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Cover],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home extends BasePage implements AfterViewInit, OnDestroy {
  private readonly pbService = inject(PocketbaseService);
  private readonly i18n = inject(I18nService);

  protected readonly homeSections = signal<any[]>([]);
  protected anchorTarget = '';

  constructor() {
    super();
    effect(() => this.loadAllHomeSections(this.i18n.currentLangCode()));
    this.route.data.subscribe(data => {
      if (data && data['location']) {
        this.anchorTarget = data['location'];
        this.triggerScroll();
      }
    });
  }

  private async loadAllHomeSections(lang: string) {
    try {
      const records = await this.pbService.pb.collection('pages').getFullList({
        filter: `type = '${PageType.Home}' && lang = '${lang}'`,
        sort: 'metadata.old_id'
      });
      this.homeSections.set(records);
      setTimeout(() => {
        this.measurePage();
        this.triggerScroll();
      }, 100);
    } catch (e) {
      console.error('Failed to load home sections', e);
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

  override ngAfterViewInit() {
    this.bookService.activeChapterSlug.set(this.currentSlug);
    super.ngAfterViewInit();
  }
}
