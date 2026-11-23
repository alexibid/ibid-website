import { integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';

export const pages = pgTable('pages', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  type: text('type').notNull(),
  lang: text('lang').notNull(),
  location: text('location'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
});

export const urls = pgTable('urls', {
  id: text('id').primaryKey(),
  url: text('url').notNull(),
  lang: text('lang').notNull(),
  pageId: text('page_id')
    .notNull()
    .references(() => pages.id, { onDelete: 'cascade' }),
});

export const media = pgTable('media', {
  id: text('id').primaryKey(),
  filename: text('filename').notNull(),
  url: text('url').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
});
