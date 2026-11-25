import { ConfigService } from '../config/config.service';
import { createMockDrizzleDb } from '../mocks/drizzle-db.mock';
import { createMockFileSystem } from '../mocks/file-system.mock';
import { PORTFOLIO_CONTENT_FIXTURES } from '../mocks/portfolio-content.mock';
import { LEGACY_MEDIA_FIXTURES } from '../mocks/portfolio-image-sources.mock';
import { CONFIG_MOCK_ENVS } from '../mocks/static-export-fixtures.mock';
import { PortfolioContentService } from './portfolio-content.service';

describe('PortfolioContentService legacy media cleanup', () => {
  it('should delete media rows whose url starts with /content-media/ and keep /images/ rows on syncAll', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    db.seedTableRows('media', [...LEGACY_MEDIA_FIXTURES.rows]);
    const fs = createMockFileSystem(PORTFOLIO_CONTENT_FIXTURES.validContentFiles);
    const service = new PortfolioContentService({ db, fs, config });

    await service.syncAll({ contentDir: PORTFOLIO_CONTENT_FIXTURES.contentDir });

    const remainingIds = db.getTableRows('media').map((row) => row['id']);
    expect(remainingIds).toEqual([LEGACY_MEDIA_FIXTURES.currentRowId]);
  });
});
