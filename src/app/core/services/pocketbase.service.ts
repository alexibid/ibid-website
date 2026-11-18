import { Injectable, inject } from '@angular/core';
import { PageType } from '../../shared/types/page-type.enum';
import type { CmsPage } from '../../shared/types/cms.interface';
import { CONTENT_REPOSITORY } from './content-repository.token';

@Injectable({
  providedIn: 'root',
})
export class PocketbaseService {
  private readonly repo = inject(CONTENT_REPOSITORY);

  async loadSections(type: PageType, lang: string): Promise<CmsPage[]> {
    return this.repo.loadSections(type, lang);
  }
}
