import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { isRecord } from '../common/type-guards.util';
import { DRIZZLE_DB, type DatabaseClient, toReturnedRows } from '../database/database.provider';
import { pages, urls } from '../database/schema';
import { StaticExportService } from '../static-export/static-export.service';

export interface UrlRecord {
  readonly id: string;
  readonly url: string;
  readonly lang: string;
  readonly pageId: string;
}

export interface UrlPageMetadata {
  readonly id: string;
  readonly title: string;
  readonly type: string;
  readonly lang: string;
  readonly location?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ExpandedUrlRecord extends UrlRecord {
  readonly page: UrlPageMetadata | null;
}

export interface UrlFilter {
  readonly lang?: string;
  readonly expandPage?: boolean;
}

export interface CreateUrlInput {
  readonly id?: string;
  readonly url: string;
  readonly lang: string;
  readonly pageId: string;
}

export interface UpdateUrlInput {
  readonly url?: string;
  readonly lang?: string;
  readonly pageId?: string;
}

@Injectable()
export class UrlsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DatabaseClient,
    @Inject(StaticExportService)
    private readonly staticExport: StaticExportService,
  ) {}

  async findAll(filter?: UrlFilter): Promise<Array<UrlRecord | ExpandedUrlRecord>> {
    if (filter?.expandPage) {
      return this.findAllExpanded(filter.lang);
    }
    const query = this.db.select().from(urls);
    const rows =
      filter?.lang !== undefined
        ? await query.where(eq(urls.lang, filter.lang))
        : await query;
    return rows.map(toUrlRecord);
  }

  async findOne(id: string): Promise<UrlRecord> {
    const rows = await this.db.select().from(urls).where(eq(urls.id, id)).limit(1);
    if (rows.length === 0) {
      throw new NotFoundException(`URL ${id} not found`);
    }
    return toUrlRecord(rows[0]);
  }

  async create(payload: CreateUrlInput): Promise<UrlRecord> {
    await this.assertPageExists(payload.pageId);
    const id = payload.id?.trim() || randomUUID();
    const raw = await this.db
      .insert(urls)
      .values({
        id,
        url: payload.url,
        lang: payload.lang,
        pageId: payload.pageId,
      })
      .returning();
    const rows = toReturnedRows(raw);
    await this.staticExport.exportAll();
    return toUrlRecord(rows[0]);
  }

  async update(id: string, payload: UpdateUrlInput): Promise<UrlRecord> {
    if (payload.pageId !== undefined) {
      await this.assertPageExists(payload.pageId);
    }
    const patch: Partial<typeof urls.$inferInsert> = {
      ...(payload.url !== undefined ? { url: payload.url } : {}),
      ...(payload.lang !== undefined ? { lang: payload.lang } : {}),
      ...(payload.pageId !== undefined ? { pageId: payload.pageId } : {}),
    };
    const raw = await this.db
      .update(urls)
      .set(patch)
      .where(eq(urls.id, id))
      .returning();
    const rows = toReturnedRows(raw);
    if (rows.length === 0) {
      throw new NotFoundException(`URL ${id} not found`);
    }
    await this.staticExport.exportAll();
    return toUrlRecord(rows[0]);
  }

  async remove(id: string): Promise<void> {
    const raw = await this.db.delete(urls).where(eq(urls.id, id)).returning();
    const rows = toReturnedRows(raw);
    if (rows.length === 0) {
      throw new NotFoundException(`URL ${id} not found`);
    }
    await this.staticExport.exportAll();
  }

  private async findAllExpanded(lang?: string): Promise<ExpandedUrlRecord[]> {
    const query = this.db
      .select({
        id: urls.id,
        url: urls.url,
        lang: urls.lang,
        pageId: urls.pageId,
        page: {
          id: pages.id,
          title: pages.title,
          type: pages.type,
          lang: pages.lang,
          location: pages.location,
          metadata: pages.metadata,
        },
      })
      .from(urls)
      .leftJoin(pages, eq(urls.pageId, pages.id));

    const rows = lang !== undefined ? await query.where(eq(urls.lang, lang)) : await query;
    return rows.map(toExpandedUrlRecord);
  }

  private async assertPageExists(pageId: string): Promise<void> {
    const rows = await this.db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
    if (rows.length === 0) {
      throw new NotFoundException(`Target page ${pageId} not found`);
    }
  }
}

function toUrlRecord(row: Record<string, unknown>): UrlRecord {
  const rawPageId = 'pageId' in row ? row['pageId'] : row['page_id'];
  return {
    id: typeof row['id'] === 'string' ? row['id'] : '',
    url: typeof row['url'] === 'string' ? row['url'] : '',
    lang: typeof row['lang'] === 'string' ? row['lang'] : '',
    pageId: typeof rawPageId === 'string' ? rawPageId : '',
  };
}

function toExpandedUrlRecord(row: Record<string, unknown>): ExpandedUrlRecord {
  const base = toUrlRecord(row);
  const rawPage = row['page'];
  if (!isRecord(rawPage) || typeof rawPage['id'] !== 'string') {
    return { ...base, page: null };
  }
  const location = typeof rawPage['location'] === 'string' ? rawPage['location'] : undefined;
  const metadata = isRecord(rawPage['metadata']) ? rawPage['metadata'] : undefined;
  return {
    ...base,
    page: {
      id: rawPage['id'],
      title: typeof rawPage['title'] === 'string' ? rawPage['title'] : '',
      type: typeof rawPage['type'] === 'string' ? rawPage['type'] : '',
      lang: typeof rawPage['lang'] === 'string' ? rawPage['lang'] : '',
      ...(location !== undefined ? { location } : {}),
      ...(metadata !== undefined ? { metadata } : {}),
    },
  };
}
