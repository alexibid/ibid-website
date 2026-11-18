import { Injectable, inject, signal, computed } from '@angular/core';
import { CONTENT_REPOSITORY } from '../../infrastructure/tokens/content-repository.token';
import { CmsPage, CmsPagePayload, CmsUrl } from '../../domain/models/cms.interface';
import { PageType } from '../../domain/models/page-type.enum';
import { locationToInt } from '../../domain/utils/location.utils';

@Injectable({
  providedIn: 'root'
})
export class AdminFacade {
  private readonly repo = inject(CONTENT_REPOSITORY);

  public readonly lang = signal<string>('');
  public readonly isLoading = signal<boolean>(true);
  public readonly allUrls = signal<CmsUrl[]>([]);

  public readonly filteredUrls = computed(() =>
    this.allUrls().filter(u => u.lang === this.lang())
  );

  public readonly homeUrls = computed(() =>
    this.filteredUrls()
      .filter(u => u.expand?.page_id?.type === PageType.Home)
      .sort((a, b) => locationToInt(a.expand?.page_id?.metadata?.location) - locationToInt(b.expand?.page_id?.metadata?.location))
  );

  public readonly chapterUrls = computed(() =>
    this.filteredUrls()
      .filter(u => u.expand?.page_id?.type === PageType.Chapter)
      .sort((a, b) => locationToInt(a.expand?.page_id?.metadata?.location) - locationToInt(b.expand?.page_id?.metadata?.location))
  );

  public readonly exitUrls = computed(() =>
    this.filteredUrls()
      .filter(u => u.expand?.page_id?.type === PageType.Exit)
      .sort((a, b) => locationToInt(a.expand?.page_id?.metadata?.location) - locationToInt(b.expand?.page_id?.metadata?.location))
  );

  public async loadUrls(): Promise<void> {
    this.isLoading.set(true);
    try {
      const records = await this.repo.getUrls();
      this.allUrls.set(records);
    } finally {
      this.isLoading.set(false);
    }
  }

  public async getUrls(): Promise<CmsUrl[]> {
    return this.repo.getUrls();
  }

  public async createUrl(data: Partial<CmsUrl>): Promise<CmsUrl> {
    return {
      id: crypto.randomUUID(),
      url: data.url ?? '',
      lang: data.lang ?? 'pt',
      page_id: data.page_id ?? ''
    };
  }

  public async deleteUrl(_id: string): Promise<void> {
    return Promise.resolve();
  }

  public async getPage(id: string): Promise<CmsPage> {
    return this.repo.getPage(id);
  }

  public async createPage(payload: CmsPagePayload): Promise<CmsPage> {
    return this.repo.createPage(payload);
  }

  public async updatePage(id: string, payload: Partial<CmsPage>): Promise<CmsPage> {
    return this.repo.updatePage(id, payload);
  }

  public async deletePage(id: string): Promise<void> {
    return this.repo.deletePage(id);
  }

  public async getPagesByType(type: string, lang: string): Promise<CmsPage[]> {
    return this.repo.getPages({ type, lang });
  }

  public async getPageByLocation(type: string, lang: string, location: string): Promise<CmsPage | null> {
    const pages = await this.repo.getPages({ type, lang });
    return pages.find((p) => p.metadata?.location === location) ?? null;
  }

  public async login(password: string): Promise<boolean> {
    return this.repo.login(password);
  }

  public async uploadImage(file: File): Promise<string> {
    return this.repo.uploadImage(file);
  }

  public async uploadImageUrl(file: File): Promise<string> {
    return this.repo.uploadImage(file);
  }
}
