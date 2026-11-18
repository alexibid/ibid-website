import { Injectable, NotFoundException } from '@nestjs/common';
import type { Page, PageInput, PagePatch, PageQuery } from './content.model.js';

export interface PagesRepository {
  list(query?: PageQuery): Promise<readonly Page[]>;
  get(id: string): Promise<Page>;
  create(input: PageInput): Promise<Page>;
  update(id: string, patch: PagePatch): Promise<Page>;
  remove(id: string): Promise<void>;
}

export const PAGES_REPOSITORY = Symbol('PAGES_REPOSITORY');

@Injectable()
export class DrizzlePagesRepository implements PagesRepository {
  private readonly items = new Map<string, Page>();

  async list(query?: PageQuery): Promise<readonly Page[]> {
    const all = Array.from(this.items.values());
    if (query === undefined) {
      return all;
    }
    return all.filter((p) => {
      if (query.type !== undefined && p.type !== query.type) {
        return false;
      }
      if (query.lang !== undefined && p.lang !== query.lang) {
        return false;
      }
      return true;
    });
  }

  async get(id: string): Promise<Page> {
    const page = this.items.get(id);
    if (page === undefined) {
      throw new NotFoundException(`Page ${id} not found`);
    }
    return page;
  }

  async create(input: PageInput): Promise<Page> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const page: Page = {
      id,
      title: input.title,
      content: input.content,
      type: input.type,
      lang: input.lang,
      location: input.location,
      metadata: input.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    this.items.set(id, page);
    return page;
  }

  async update(id: string, patch: PagePatch): Promise<Page> {
    const existing = await this.get(id);
    const updated: Page = {
      ...existing,
      ...patch,
      metadata: patch.metadata ?? existing.metadata,
      updatedAt: new Date().toISOString(),
    };
    this.items.set(id, updated);
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    this.items.delete(id);
  }
}
