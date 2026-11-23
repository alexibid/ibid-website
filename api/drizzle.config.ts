import { defineConfig } from 'drizzle-kit';

const host = process.env['POSTGRES_HOST'] ?? '127.0.0.1';
const port = Number(process.env['POSTGRES_PORT'] ?? '54330');
const database = process.env['POSTGRES_DB'] ?? 'ibid_website';
const user = process.env['POSTGRES_USER'] ?? 'ibid';
const password = process.env['POSTGRES_PASSWORD'] ?? '';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './drizzle',
  dbCredentials: {
    host,
    port,
    database,
    user,
    password,
    ssl: false,
  },
});
