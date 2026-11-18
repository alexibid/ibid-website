import { Injectable, inject } from '@angular/core';
import type { CmsPage, CmsUrl } from '../../shared/types/cms.interface';
import { PageType } from '../../shared/types/page-type.enum';
import type { ContentRepository } from './content-repository.token';
import { API_BASE_URL } from '../tokens/api.tokens';

@Injectable({
  providedIn: 'root',
})
export class ApiContentRepository implements ContentRepository {
  private readonly baseUrl = inject(API_BASE_URL);

  async loadSections(type: PageType, lang: string): Promise<CmsPage[]> {
    return this.getPages({ type, lang });
  }

  async getUrls(): Promise<CmsUrl[]> {
    try {
      const response = await fetch(`${this.baseUrl}/urls`);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      return (await response.json()) as CmsUrl[];
    } catch {
      throw new Error('Cannot reach API: please verify the backend service is running');
    }
  }

  async getPages(query?: { type?: string; lang?: string }): Promise<CmsPage[]> {
    const params = new URLSearchParams();
    if (query?.type) params.set('type', query.type);
    if (query?.lang) params.set('lang', query.lang);

    const queryString = params.toString();
    const url = `${this.baseUrl}/pages${queryString ? '?' + queryString : ''}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
      return (await response.json()) as CmsPage[];
    } catch {
      throw new Error('Cannot reach API: please verify the backend service is running');
    }
  }

  async getPage(id: string): Promise<CmsPage> {
    try {
      const response = await fetch(`${this.baseUrl}/pages/${id}`);
      if (!response.ok) {
        throw new Error(`Page ${id} not found`);
      }
      return (await response.json()) as CmsPage;
    } catch {
      throw new Error('Cannot reach API: please verify the backend service is running');
    }
  }

  async createPage(data: Partial<CmsPage>): Promise<CmsPage> {
    try {
      const response = await fetch(`${this.baseUrl}/pages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`Create failed: ${response.statusText}`);
      }
      return (await response.json()) as CmsPage;
    } catch {
      throw new Error('Cannot reach API: please verify the backend service is running');
    }
  }

  async updatePage(id: string, data: Partial<CmsPage>): Promise<CmsPage> {
    try {
      const response = await fetch(`${this.baseUrl}/pages/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`Update failed: ${response.statusText}`);
      }
      return (await response.json()) as CmsPage;
    } catch {
      throw new Error('Cannot reach API: please verify the backend service is running');
    }
  }

  async deletePage(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/pages/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }
    } catch {
      throw new Error('Cannot reach API: please verify the backend service is running');
    }
  }

  async login(password: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        return false;
      }
      const data = (await response.json()) as { authenticated?: boolean };
      return data.authenticated === true;
    } catch {
      throw new Error('Cannot reach API: please verify the backend service is running');
    }
  }

  async uploadImage(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${this.baseUrl}/media`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) {
      throw new Error('Upload failed');
    }
    const data = (await response.json()) as { file?: string };
    return `/content-media/${data.file ?? 'uploaded.webp'}`;
  }
}
