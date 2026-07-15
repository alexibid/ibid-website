import { Injectable } from '@angular/core';
import PocketBase from 'pocketbase';
import { PageType } from '../../shared/types/page-type.enum';
import { CmsPage } from '../../shared/types/cms.interface';

@Injectable({
  providedIn: 'root'
})
export class PocketbaseService {
  public readonly pb: PocketBase;

  constructor() {
    this.pb = new PocketBase('http://127.0.0.1:8090');
    this.pb.autoCancellation(false);
  }

  async loadSections(type: PageType, lang: string): Promise<CmsPage[]> {
    const filter = `type = '${type}' && lang = '${lang}'`;
    return this.pb.collection('pages').getFullList<CmsPage>({
      filter: filter,
      sort: type === PageType.Home ? 'metadata.location' : ''
    });
  }
}
