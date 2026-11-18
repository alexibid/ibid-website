import { Injectable, inject, signal, computed } from '@angular/core';
import { AdminService } from '../../../core/services/admin.service';
import { CmsPage, CmsPagePayload, CmsUrl } from '../../../shared/types/cms.interface';
import { PageType } from '../../../shared/types/page-type.enum';
import { locationToInt } from '../../../shared/utils/location.utils';

@Injectable({
  providedIn: 'root'
})
export class AdminFacade {
  private readonly adminService = inject(AdminService);

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
      const records = await this.adminService.getUrls();
      this.allUrls.set(records);
    } finally {
      this.isLoading.set(false);
    }
  }

  public async getPage(id: string): Promise<CmsPage> {
    return this.adminService.getPage(id);
  }

  public async createPage(payload: CmsPagePayload): Promise<CmsPage> {
    return this.adminService.createPage(payload);
  }

  public async updatePage(id: string, payload: CmsPagePayload): Promise<CmsPage> {
    return this.adminService.updatePage(id, payload);
  }

  public async deletePage(id: string): Promise<void> {
    return this.adminService.deletePage(id);
  }

  public async login(password: string): Promise<boolean> {
    return this.adminService.login(password);
  }

  public async uploadImage(file: File): Promise<string> {
    return this.adminService.uploadImage(file);
  }
}
