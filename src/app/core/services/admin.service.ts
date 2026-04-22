import { Injectable, inject } from '@angular/core';
import { PocketbaseService } from './pocketbase.service';
import { CmsPage, CmsUrl } from '../../shared/types/cms.interface';

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private pbService = inject(PocketbaseService);
  private pb = this.pbService.pb;

  // CRUD for Pages
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

  // CRUD for URLs
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

  // Image Upload helper
  async uploadImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    // Let's assume we have an 'assets' or 'media' collection for images
    // For now, let's use a generic 'assets' collection or just attach to page
    // Actually, PocketBase allows files on any collection.
    // Let's create a dedicated 'media' collection in PocketBase schema later if needed.
    // For simplicity, we can upload to a 'media' collection.
    return this.pb.collection('media').create(formData);
  }

  getFileUrl(record: any, fileName: string) {
    return this.pb.files.getURL(record, fileName);
  }
}
