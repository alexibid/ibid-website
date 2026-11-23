import { drizzle } from 'drizzle-orm/node-postgres';
import { ConfigService } from '../config/config.service';
import { loadApiEnv } from '../config/env-loader';
import { createPgPool, ensureDatabaseSchema } from '../database/database.provider';
import * as schema from '../database/schema';
import { StaticExportService } from '../static-export/static-export.service';
import { FileSystemService } from '../storage/file-system.service';
import { PortfolioContentService } from './portfolio-content.service';

async function runSync(): Promise<void> {
  loadApiEnv();
  const config = new ConfigService(process.env);
  const fs = new FileSystemService();
  const pool = createPgPool(config);
  const exportStatic = process.argv.includes('--export');

  try {
    await ensureDatabaseSchema(pool);
    const db = drizzle(pool, { schema });
    const exporter = new StaticExportService(db, fs, config);
    const service = new PortfolioContentService({
      db,
      fs,
      config,
      staticExport: exporter,
    });
    const result = await service.syncAll({ exportStatic });

    process.stdout.write(
      `Synced ${result.pagesSynced} pages and ${result.urlsSynced} urls (repaired ${result.pagesRepaired}, media preserved ${result.mediaPreserved}, static exported: ${String(result.staticExported)})\n`,
    );
  } finally {
    await pool.end();
  }
}

runSync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Portfolio content sync failed: ${message}\n`);
  process.exit(1);
});
