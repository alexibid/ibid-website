import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { SQL } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { SelectedFields } from 'drizzle-orm/pg-core';
import { Pool } from 'pg';
import { ConfigService } from '../config/config.service';
import * as schema from './schema';

export const PG_POOL = Symbol('PG_POOL');
export const DRIZZLE_DB = Symbol('DRIZZLE_DB');

export interface DatabasePool {
  query(sqlText: string): Promise<unknown>;
  end(): Promise<void>;
}

export interface SelectResultChain extends PromiseLike<Record<string, unknown>[]> {
  limit(count: number): PromiseLike<Record<string, unknown>[]>;
}

export interface SelectJoinChain extends SelectResultChain {
  where(condition: SQL | undefined): SelectResultChain;
}

export interface SelectChain extends SelectJoinChain {
  leftJoin(
    table: typeof schema.pages | typeof schema.urls | typeof schema.media,
    on: SQL | undefined,
  ): SelectJoinChain;
}

export interface SelectStart {
  from(table: typeof schema.pages): SelectChain;
  from(table: typeof schema.urls): SelectChain;
  from(table: typeof schema.media): SelectChain;
}

export interface InsertChain extends PromiseLike<unknown> {
  onConflictDoNothing(): PromiseLike<unknown>;
  returning(): PromiseLike<unknown>;
}

export interface InsertStart<TRow> {
  values(input: TRow | TRow[]): InsertChain;
}

export interface UpdateWhereChain extends PromiseLike<unknown> {
  returning(): PromiseLike<unknown>;
}

export interface UpdateChain {
  where(condition: SQL | undefined): UpdateWhereChain;
}

export interface UpdateStart<TRow> {
  set(values: Partial<TRow>): UpdateChain;
}

export interface DeleteWhereChain extends PromiseLike<unknown> {
  returning(): PromiseLike<unknown>;
}

export function toReturnedRows(result: unknown): Record<string, unknown>[] {
  if (!Array.isArray(result)) {
    return [];
  }
  return result.filter(
    (entry): entry is Record<string, unknown> =>
      typeof entry === 'object' && entry !== null && !Array.isArray(entry),
  );
}

export interface DeleteChain {
  where(condition: SQL | undefined): DeleteWhereChain;
}

export interface DatabaseClient {
  select(): SelectStart;
  select(selection: SelectedFields): SelectStart;
  insert(table: typeof schema.pages): InsertStart<typeof schema.pages.$inferInsert>;
  insert(table: typeof schema.urls): InsertStart<typeof schema.urls.$inferInsert>;
  insert(table: typeof schema.media): InsertStart<typeof schema.media.$inferInsert>;
  update(table: typeof schema.pages): UpdateStart<typeof schema.pages.$inferInsert>;
  update(table: typeof schema.urls): UpdateStart<typeof schema.urls.$inferInsert>;
  update(table: typeof schema.media): UpdateStart<typeof schema.media.$inferInsert>;
  delete(table: typeof schema.pages): DeleteChain;
  delete(table: typeof schema.urls): DeleteChain;
  delete(table: typeof schema.media): DeleteChain;
  transaction<T>(callback: (tx: DatabaseClient) => Promise<T>): Promise<T>;
}

export function createPgPool(config: ConfigService): Pool {
  return new Pool({
    host: config.pgConfig.host,
    port: config.pgConfig.port,
    database: config.pgConfig.database,
    user: config.pgConfig.user,
    password: config.pgConfig.password,
  });
}

export async function ensureDatabaseSchema(pool: DatabasePool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pages (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT NOT NULL,
      lang TEXT NOT NULL,
      location TEXT,
      metadata JSONB
    );
    CREATE TABLE IF NOT EXISTS urls (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      lang TEXT NOT NULL,
      page_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      url TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pages_type_lang ON pages(type, lang);
    CREATE INDEX IF NOT EXISTS idx_urls_lang ON urls(lang);
    CREATE INDEX IF NOT EXISTS idx_urls_page_id ON urls(page_id);
  `);
}

@Injectable()
export class DatabaseShutdownHook implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: DatabasePool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

export const databaseProviders = [
  {
    provide: PG_POOL,
    useFactory: (config: ConfigService): Pool => createPgPool(config),
    inject: [ConfigService],
  },
  {
    provide: DRIZZLE_DB,
    useFactory: async (pool: Pool): Promise<NodePgDatabase<typeof schema>> => {
      await ensureDatabaseSchema(pool);
      return drizzle(pool, { schema });
    },
    inject: [PG_POOL],
  },
];
