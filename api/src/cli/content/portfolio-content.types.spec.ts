import { PORTFOLIO_EXCLUSION_FIXTURES } from '../../mocks/portfolio-content-exclusions.mock';
import { PORTFOLIO_CONTENT_FIXTURES } from '../../mocks/portfolio-content.mock';
import { PORTFOLIO_IMAGE_SOURCE_FIXTURES } from '../../mocks/portfolio-image-sources.mock';
import { validatePortfolioDataset } from './portfolio-content.types';

describe('validatePortfolioDataset image sources', () => {
  it('should accept images served from /images/ or https:// sources', () => {
    expect(() =>
      validatePortfolioDataset(PORTFOLIO_IMAGE_SOURCE_FIXTURES.imagesFolderSource)
    ).not.toThrow();
    expect(() =>
      validatePortfolioDataset(PORTFOLIO_IMAGE_SOURCE_FIXTURES.httpsSource)
    ).not.toThrow();
  });

  it('should reject images served from the legacy /content-media/ source', () => {
    expect(() =>
      validatePortfolioDataset(PORTFOLIO_IMAGE_SOURCE_FIXTURES.legacyContentMediaSource)
    ).toThrow('Invalid image tag');
  });
});

describe('validatePortfolioDataset standalone chapter exclusions and consolidated ibid. topic', () => {
  it('should reject standalone boilerplate, ibid-ui, or ibid-workspace chapters', () => {
    for (const dataset of PORTFOLIO_EXCLUSION_FIXTURES.standaloneChapterDatasets) {
      expect(() => validatePortfolioDataset(dataset.entries)).toThrow();
    }
  });

  it('should accept the consolidated ibid. web engineering quality topic across all five languages', () => {
    expect(() =>
      validatePortfolioDataset(PORTFOLIO_CONTENT_FIXTURES.consolidatedIbidEntries)
    ).not.toThrow();
  });
});
