import { Injectable, inject, signal } from '@angular/core';
import { CONTENT_REPOSITORY } from '../../infrastructure/tokens/content-repository.token';
import { BookService } from '../../infrastructure/services/book.service';
import { StateService } from '../state/state.service';
import { PageType } from '../../domain/models/page-type.enum';
import { CmsPage } from '../../domain/models/cms.interface';
import { locationToInt } from '../../domain/utils/location.utils';

@Injectable({
  providedIn: 'root'
})
export class BookFacade {
  private readonly repo = inject(CONTENT_REPOSITORY);
  private readonly bookService = inject(BookService);
  public readonly stateService = inject(StateService);

  public readonly sections = signal<readonly CmsPage[]>([]);
  public readonly isLoading = signal<boolean>(false);

  public async loadHomeSections(lang: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const records = await this.repo.loadSections(PageType.Home, lang);
      records.sort((a, b) => {
        const orderA = locationToInt(a.metadata?.location);
        const orderB = locationToInt(b.metadata?.location);
        return orderA - orderB;
      });
      this.sections.set(records);
      const frontCover = records.find(s => s.metadata?.location === 'front-cover');
      if (frontCover) {
        this.stateService.coverData.set(frontCover);
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  public setPageCount(slug: string, count: number): void {
    this.bookService.setPageCount(slug, count);
  }
}
