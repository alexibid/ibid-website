import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { ADMIN_CONTENT_REPOSITORY } from '../../infrastructure/tokens/content-repository.token';
import { RoutingService } from '../../infrastructure/services/routing.service';
import { CmsPage, CmsPagePayload, CmsUrl } from '../../domain/models/cms.interface';
import { PageType } from '../../domain/models/page-type.enum';
import { locationToInt } from '../../domain/utils/location.utils';

@Injectable({
  providedIn: 'root'
})
export class AdminFacade {
  private readonly repo = inject(ADMIN_CONTENT_REPOSITORY);
  private readonly injector = inject(Injector);

  public readonly lang = signal<string>('');
  public readonly isLoading = signal<boolean>(true);
  public readonly error = signal<string | null>(null);
  public readonly allUrls = signal<CmsUrl[]>([]);

  public readonly filteredUrls = computed(() =>
    this.allUrls().filter((u) => u.lang === this.lang())
  );

  public readonly homeUrls = computed(() =>
    this.filteredUrls()
      .filter((u) => u.expand?.page_id?.type === PageType.Home)
      .sort(
        (a, b) =>
          locationToInt(a.expand?.page_id?.metadata?.location) -
          locationToInt(b.expand?.page_id?.metadata?.location)
      )
  );

  public readonly chapterUrls = computed(() =>
    this.filteredUrls()
      .filter((u) => u.expand?.page_id?.type === PageType.Chapter)
      .sort(
        (a, b) =>
          locationToInt(a.expand?.page_id?.metadata?.location) -
          locationToInt(b.expand?.page_id?.metadata?.location)
      )
  );

  public readonly exitUrls = computed(() =>
    this.filteredUrls()
      .filter((u) => u.expand?.page_id?.type === PageType.Exit)
      .sort(
        (a, b) =>
          locationToInt(a.expand?.page_id?.metadata?.location) -
          locationToInt(b.expand?.page_id?.metadata?.location)
      )
  );

  public clearError(): void {
    this.error.set(null);
  }

  public async loadUrls(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      const records = await this.repo.getUrls();
      const needsHydration = records.some((record) => !record.expand?.page_id);
      if (!needsHydration) {
        this.allUrls.set(records);
        return;
      }
      const pages = await this.repo.getPages();
      const pageMap = new Map(pages.map((page) => [page.id, page]));
      const hydrated = records.map((record) =>
        record.expand?.page_id
          ? record
          : { ...record, expand: { page_id: pageMap.get(record.page_id) } }
      );
      this.allUrls.set(hydrated);
    } catch (err) {
      this.error.set(this.toErrorMessage(err, 'Failed to load content records.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  public async getUrls(): Promise<CmsUrl[]> {
    return this.runAction(() => this.repo.getUrls(), 'Failed to fetch URLs.');
  }

  public async createUrl(data: Partial<CmsUrl>): Promise<CmsUrl> {
    return this.runMutation(() => this.repo.createUrl(data), 'Failed to create URL.');
  }

  public async deleteUrl(id: string): Promise<void> {
    return this.runMutation(() => this.repo.deleteUrl(id), 'Failed to delete URL.');
  }

  public async getPage(id: string): Promise<CmsPage> {
    return this.runAction(() => this.repo.getPage(id), 'Failed to load page.');
  }

  public async createPage(payload: CmsPagePayload): Promise<CmsPage> {
    return this.runMutation(() => this.repo.createPage(payload), 'Failed to create page.');
  }

  public async updatePage(id: string, payload: Partial<CmsPage>): Promise<CmsPage> {
    return this.runMutation(() => this.repo.updatePage(id, payload), 'Failed to update page.');
  }

  public async deletePage(id: string): Promise<void> {
    return this.runMutation(() => this.repo.deletePage(id), 'Failed to delete page.');
  }

  public async getPagesByType(type: string, lang: string): Promise<CmsPage[]> {
    return this.runAction(
      () => this.repo.getPages({ type, lang }),
      'Failed to load pages by type.'
    );
  }

  public async getPageByLocation(
    type: string,
    lang: string,
    location: string
  ): Promise<CmsPage | null> {
    const pages = await this.getPagesByType(type, lang);
    return pages.find((p) => p.metadata?.location === location) ?? null;
  }

  public async uploadImage(file: File): Promise<string> {
    return this.runAction(() => this.repo.uploadImage(file), 'Failed to upload image.');
  }

  public async uploadImageUrl(file: File): Promise<string> {
    return this.uploadImage(file);
  }

  private async runAction<T>(task: () => Promise<T>, fallbackMessage: string): Promise<T> {
    this.error.set(null);
    try {
      return await task();
    } catch (err) {
      this.error.set(this.toErrorMessage(err, fallbackMessage));
      throw err;
    }
  }

  private async runMutation<T>(task: () => Promise<T>, fallbackMessage: string): Promise<T> {
    const result = await this.runAction(task, fallbackMessage);
    await this.refreshRoutesQuietly();
    return result;
  }

  private async refreshRoutesQuietly(): Promise<void> {
    try {
      await this.injector.get(RoutingService).refreshRoutes();
    } catch (err) {
      console.error('Failed to refresh routes after saving', err);
    }
  }

  private toErrorMessage(err: unknown, fallback: string): string {
    return err instanceof Error && err.message ? err.message : fallback;
  }
}
