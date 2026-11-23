import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, eq, type SQL } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { isRecord } from '../common/type-guards.util';
import { DRIZZLE_DB, type DatabaseClient, toReturnedRows } from '../database/database.provider';
import { pages } from '../database/schema';
import { StaticExportService } from '../static-export/static-export.service';

export interface PageRecord {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly type: string;
  readonly lang: string;
  readonly location?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface PageFilter {
  readonly type?: string;
  readonly lang?: string;
}

export interface CreatePageInput {
  readonly id?: string;
  readonly title: string;
  readonly content: string;
  readonly type: string;
  readonly lang: string;
  readonly location?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface UpdatePageInput {
  readonly title?: string;
  readonly content?: string;
  readonly type?: string;
  readonly lang?: string;
  readonly location?: string;
  readonly metadata?: Record<string, unknown>;
}

@Injectable()
export class PagesService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DatabaseClient,
    @Inject(StaticExportService)
    private readonly staticExport: StaticExportService,
  ) {}

  async findAll(filter?: PageFilter): Promise<PageRecord[]> {
    const condition = buildPageFilter(filter);
    const query = this.db.select().from(pages);
    const rows = condition ? await query.where(condition) : await query;
    return rows.map(toPageRecord);
  }

  async findOne(id: string): Promise<PageRecord> {
    const rows = await this.db.select().from(pages).where(eq(pages.id, id)).limit(1);
    if (rows.length === 0) {
      throw new NotFoundException(`Page ${id} not found`);
    }
    return toPageRecord(rows[0]);
  }

  async create(payload: CreatePageInput): Promise<PageRecord> {
    const id = payload.id?.trim() || randomUUID();
    const raw = await this.db
      .insert(pages)
      .values({
        id,
        title: payload.title,
        content: payload.content,
        type: payload.type,
        lang: payload.lang,
        location: payload.location ?? null,
        metadata: payload.metadata ?? null,
      })
      .returning();
    const rows = toReturnedRows(raw);
    await this.staticExport.exportAll();
    return toPageRecord(rows[0]);
  }

  async update(id: string, payload: UpdatePageInput): Promise<PageRecord> {
    const patch = buildPagePatch(payload);
    const raw = await this.db
      .update(pages)
      .set(patch)
      .where(eq(pages.id, id))
      .returning();
    const rows = toReturnedRows(raw);
    if (rows.length === 0) {
      throw new NotFoundException(`Page ${id} not found`);
    }
    await this.staticExport.exportAll();
    return toPageRecord(rows[0]);
  }

  async remove(id: string): Promise<void> {
    const raw = await this.db.delete(pages).where(eq(pages.id, id)).returning();
    const rows = toReturnedRows(raw);
    if (rows.length === 0) {
      throw new NotFoundException(`Page ${id} not found`);
    }
    await this.staticExport.exportAll();
  }
}

function buildPageFilter(filter?: PageFilter): SQL | undefined {
  if (!filter) {
    return undefined;
  }
  const conditions: SQL[] = [];
  if (filter.type !== undefined) {
    conditions.push(eq(pages.type, filter.type));
  }
  if (filter.lang !== undefined) {
    conditions.push(eq(pages.lang, filter.lang));
  }
  if (conditions.length === 0) {
    return undefined;
  }
  return conditions.length === 1 ? conditions[0] : and(...conditions);
}

function buildPagePatch(payload: UpdatePageInput): Partial<typeof pages.$inferInsert> {
  return {
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.content !== undefined ? { content: payload.content } : {}),
    ...(payload.type !== undefined ? { type: payload.type } : {}),
    ...(payload.lang !== undefined ? { lang: payload.lang } : {}),
    ...(payload.location !== undefined ? { location: payload.location } : {}),
    ...(payload.metadata !== undefined ? { metadata: payload.metadata } : {}),
  };
}

function toPageRecord(row: Record<string, unknown>): PageRecord {
  const location = typeof row['location'] === 'string' ? row['location'] : undefined;
  const metadata = isRecord(row['metadata']) ? row['metadata'] : undefined;
  return {
    id: typeof row['id'] === 'string' ? row['id'] : '',
    title: typeof row['title'] === 'string' ? row['title'] : '',
    content: typeof row['content'] === 'string' ? row['content'] : '',
    type: typeof row['type'] === 'string' ? row['type'] : '',
    lang: typeof row['lang'] === 'string' ? row['lang'] : '',
    ...(location !== undefined ? { location } : {}),
    ...(metadata !== undefined ? { metadata } : {}),
  };
}
