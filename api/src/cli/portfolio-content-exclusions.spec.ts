import { ConfigService } from '../config/config.service';
import { createMockDrizzleDb } from '../mocks/drizzle-db.mock';
import { createMockFileSystem } from '../mocks/file-system.mock';
import { PORTFOLIO_CONTENT_FIXTURES } from '../mocks/portfolio-content.mock';
import { CONFIG_MOCK_ENVS } from '../mocks/static-export-fixtures.mock';
import type { PortfolioEntry } from './content/portfolio-content.types';
import { PORTFOLIO_EXCLUSION_FIXTURES } from '../mocks/portfolio-content-exclusions.mock';
import { PortfolioContentService } from './portfolio-content.service';

async function runValidation(
  service: PortfolioContentService,
  entries: readonly PortfolioEntry[],
): Promise<void> {
  await Promise.resolve(service.validateEntries(entries));
}

describe('portfolio content internal tooling exclusions', () => {
  it('should reject datasets containing Nx, nx graph, workspace-menu, media-slot-ch5-nx-graph, media-slot-ch5-menubar-app, menu bar, project graph, or VS Code in PortfolioContentService.validateEntries while accepting clean datasets', async () => {
    const config = new ConfigService(CONFIG_MOCK_ENVS.configured);
    const db = createMockDrizzleDb();
    const fs = createMockFileSystem();
    const service = new PortfolioContentService({ db, fs, config });

    await expect(
      runValidation(service, PORTFOLIO_CONTENT_FIXTURES.validEntries),
    ).resolves.toBeUndefined();

    await expect(runValidation(service, [])).rejects.toThrow();

    for (const invalidCase of PORTFOLIO_EXCLUSION_FIXTURES.invalidDatasets) {
      await expect(runValidation(service, invalidCase.entries)).rejects.toThrow();
    }
  });
});
