import { Injectable, PLATFORM_ID, PendingTasks, TransferState, inject, signal } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { CONTENT_READ_REPOSITORY } from '../../infrastructure/tokens/content-repository.token';
import { BookService } from '../../infrastructure/services/book.service';
import { StateService } from '../state/state.service';
import { readTransferredSections, writeTransferredSections } from '../state/page-sections.transfer';
import { PageType } from '../../domain/models/page-type.enum';
import { CmsPage } from '../../domain/models/cms.interface';
import { locationToInt } from '../../domain/utils/location.utils';

@Injectable({
  providedIn: 'root'
})
export class BookFacade {
  private readonly repo = inject(CONTENT_READ_REPOSITORY);
  private readonly bookService = inject(BookService);
  private readonly pendingTasks = inject(PendingTasks);
  private readonly transferState = inject(TransferState);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));
  public readonly stateService = inject(StateService);

  public readonly sections = signal<readonly CmsPage[]>([]);
  public readonly currentChapter = signal<CmsPage | null>(null);
  public readonly activeChapter = this.currentChapter.asReadonly();
  public readonly isLoading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);

  private sectionsRequestToken = 0;
  private chapterRequestToken = 0;

  public async loadHomeSections(lang: string): Promise<void> {
    const transferred = readTransferredSections(this.transferState, PageType.Home, lang);
    if (transferred.length > 0) {
      this.showHomeSections(transferred);
      return;
    }
    const token = ++this.sectionsRequestToken;
    const done = this.pendingTasks.add();
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const records = await this.repo.loadSections(PageType.Home, lang);
      if (token !== this.sectionsRequestToken) {
        return;
      }
      const sorted = [...records].sort(
        (a, b) => locationToInt(a.metadata?.location) - locationToInt(b.metadata?.location)
      );
      this.showHomeSections(sorted);
      if (this.isServer) writeTransferredSections(this.transferState, PageType.Home, { lang, sections: sorted });
    } catch (err) {
      if (token !== this.sectionsRequestToken) {
        return;
      }
      this.error.set(err instanceof Error && err.message ? err.message : 'Failed to load sections.');
    } finally {
      if (token === this.sectionsRequestToken) {
        this.isLoading.set(false);
      }
      done();
    }
  }

  public async loadChapter(pageId: string): Promise<void> {
    const token = ++this.chapterRequestToken;
    const done = this.pendingTasks.add();
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const chapter = await this.repo.getPage(pageId);
      if (token !== this.chapterRequestToken) {
        return;
      }
      this.currentChapter.set(chapter);
    } catch (err) {
      if (token !== this.chapterRequestToken) {
        return;
      }
      this.currentChapter.set(null);
      this.error.set(err instanceof Error && err.message ? err.message : 'Failed to load chapter.');
    } finally {
      if (token === this.chapterRequestToken) {
        this.isLoading.set(false);
      }
      done();
    }
  }

  public setPageCount(slug: string, count: number): void {
    this.bookService.setPageCount(slug, count);
  }

  private showHomeSections(sections: readonly CmsPage[]): void {
    this.sections.set([...sections]);
    const frontCover = sections.find((s) => s.metadata?.location === 'front-cover');
    if (frontCover) {
      this.stateService.coverData.set(frontCover);
    }
  }
}
