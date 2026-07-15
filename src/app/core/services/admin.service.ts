import { Injectable, inject } from '@angular/core';
import { PocketbaseService } from './pocketbase.service';
import { CmsPage, CmsUrl } from '../../shared/types/cms.interface';
import { RecordModel } from 'pocketbase';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private pbService = inject(PocketbaseService);
  private pb = this.pbService.pb;
  async getPages() {
    return this.pb.collection('pages').getFullList<CmsPage>({
      sort: '-created',
    });
  }

  async getPage(id: string) {
    return this.pb.collection('pages').getOne<CmsPage>(id);
  }

  async createPage(data: Partial<CmsPage>) {
    return this.pb.collection('pages').create<CmsPage>(data);
  }

  async updatePage(id: string, data: Partial<CmsPage>) {
    return this.pb.collection('pages').update<CmsPage>(id, data);
  }

  async deletePage(id: string) {
    return this.pb.collection('pages').delete(id);
  }

  async getPagesByType(type: string, lang: string) {
    return this.pb.collection('pages').getFullList<CmsPage>({
      filter: `type = "${type}" && lang = "${lang}"`,
    });
  }

  async getPageByLocation(type: string, lang: string, location: string) {
    return this.pb.collection('pages').getFirstListItem<CmsPage>(
      `type = "${type}" && lang = "${lang}" && metadata.location = "${location}"`
    ).catch(() => null);
  }

  async getUrls() {
    return this.pb.collection('urls').getFullList<CmsUrl>({
      expand: 'page_id',
      sort: 'url',
    });
  }

  async getUrl(id: string) {
    return this.pb.collection('urls').getOne<CmsUrl>(id, {
      expand: 'page_id',
    });
  }

  async createUrl(data: Partial<CmsUrl>) {
    return this.pb.collection('urls').create<CmsUrl>(data);
  }

  async updateUrl(id: string, data: Partial<CmsUrl>) {
    return this.pb.collection('urls').update<CmsUrl>(id, data);
  }

  async deleteUrl(id: string) {
    return this.pb.collection('urls').delete(id);
  }

  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.pb.collection('media').create(formData);
  }

  getFileUrl(record: RecordModel, fileName: string) {
    return this.pb.files.getURL(record, fileName);
  }
}
