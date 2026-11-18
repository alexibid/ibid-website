import { TestBed } from '@angular/core/testing';
import { CONTENT_REPOSITORY } from '../tokens/content-repository.token';
import type { ContentRepository } from '../../domain/repositories/content.repository';
import { PageType } from '../../domain/models/page-type.enum';
import type { CmsPage, CmsUrl } from '../../domain/models/cms.interface';

class MockContentRepository implements ContentRepository {
  async getUrls(): Promise<CmsUrl[]> {
    return [
      { id: '1', url: 'pt/capitulo-1', lang: 'pt' } as CmsUrl
    ];
  }

  async loadSections(type: PageType, lang: string): Promise<CmsPage[]> {
    return [
      { id: '1', title: 'Mock Page', type, lang } as CmsPage
    ];
  }

  async getPages(): Promise<CmsPage[]> {
    return [];
  }

  async getPage(id: string): Promise<CmsPage> {
    return { id, title: 'Single Mock Page' } as CmsPage;
  }

  async createPage(data: Partial<CmsPage>): Promise<CmsPage> {
    return { id: 'created', ...data } as CmsPage;
  }

  async updatePage(id: string, data: Partial<CmsPage>): Promise<CmsPage> {
    return { id, ...data } as CmsPage;
  }

  async deletePage(): Promise<void> {}

  async login(): Promise<boolean> {
    return true;
  }

  async uploadImage(): Promise<string> {
    return '/mock-image.webp';
  }
}

describe('ContentRepository replacement in unit tests', () => {
  it('replaces content source in a single place via DI token', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: CONTENT_REPOSITORY, useClass: MockContentRepository }
      ]
    });

    const repo = TestBed.inject(CONTENT_REPOSITORY);
    expect(repo).toBeDefined();

    const sections = await repo.loadSections(PageType.Home, 'pt');
    expect(sections.length).toBe(1);
    expect(sections[0].title).toBe('Mock Page');

    const urls = await repo.getUrls();
    expect(urls.length).toBe(1);
    expect(urls[0].url).toBe('pt/capitulo-1');
  });
});
