import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const pages = pgTable('pages', {
  id: uuid('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  type: text('type').notNull(),
  lang: text('lang').notNull(),
  location: text('location'),
  metadata: jsonb('metadata').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const urls = pgTable('urls', {
  id: uuid('id').primaryKey(),
  url: text('url').notNull(),
  lang: text('lang').notNull(),
  pageId: uuid('page_id')
    .notNull()
    .references(() => pages.id, { onDelete: 'cascade' }),
});
