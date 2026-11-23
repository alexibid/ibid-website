import { PORTFOLIO_CONTENT_FIXTURES, type PortfolioMockEntry } from './portfolio-content.mock';

export interface InvalidExclusionDataset {
  readonly label: string;
  readonly entries: readonly PortfolioMockEntry[];
}

function patchEntry(
  entries: readonly PortfolioMockEntry[],
  lang: PortfolioMockEntry['lang'],
  location: string,
  patch: Partial<PortfolioMockEntry>,
): PortfolioMockEntry[] {
  return entries.map((entry) =>
    entry.lang === lang && entry.location === location ? { ...entry, ...patch } : entry,
  );
}

const INVALID_DATASETS: readonly InvalidExclusionDataset[] = [
  {
    label: 'nx-in-chapter-v',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'en', 'V', {
      content: '<p>ibid-workspace monorepo built with Nx and GitHub Actions.</p>',
    }),
  },
  {
    label: 'nx-23-in-chapter-v',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'pt', 'V', {
      content: '<p>O ibid-workspace é um monorepo Nx 23 com GitHub Actions.</p>',
    }),
  },
  {
    label: 'nx-hyphen-23-in-chapter-v',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'de', 'V', {
      content: '<p>ibid-workspace ist ein Nx-23-Monorepo mit GitHub Actions.</p>',
    }),
  },
  {
    label: 'nx-graph-in-preface',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'en', 'preface', {
      content: '<p>Built with TypeScript, Angular, and nx graph.</p>',
    }),
  },
  {
    label: 'workspace-menu-in-chapter-v',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'en', 'V', {
      content: '<p>Includes workspace-menu helper for CI health.</p>',
    }),
  },
  {
    label: 'media-slot-ch5-nx-graph',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'en', 'V', {
      content:
        '<p>ibid-workspace monorepo.</p><figure class="media-slot" id="media-slot-ch5-nx-graph"></figure>',
    }),
  },
  {
    label: 'media-slot-ch5-menubar-app',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'pt', 'V', {
      content:
        '<p>ibid-workspace monorepo.</p><figure class="media-slot" id="media-slot-ch5-menubar-app"></figure>',
    }),
  },
  {
    label: 'menu-bar-and-vs-code',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'en', 'V', {
      content: '<p>macOS menu bar app and VS Code extension.</p>',
    }),
  },
  {
    label: 'localized-pt-barra-de-menus-and-vs-code',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'pt', 'V', {
      content: '<p>App de barra de menus e extensão de VS Code.</p>',
    }),
  },
  {
    label: 'localized-es-barra-de-menus-and-grafo',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'es', 'V', {
      content: '<p>App de barra de menús y grafo de proyecto.</p>',
    }),
  },
  {
    label: 'localized-fr-barre-de-menus-and-graphe',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'fr', 'V', {
      content: '<p>App de barre de menus et graphe de monorepo.</p>',
    }),
  },
  {
    label: 'localized-de-menuleisten-and-projektgraph',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'de', 'V', {
      content: '<p>Menüleisten-App, Projektgraph und VS-Code.</p>',
    }),
  },
  {
    label: 'nx-in-title',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'en', 'V', {
      title: 'ibid-workspace — Nx Monorepo',
    }),
  },
  {
    label: 'workspace-menu-in-slug',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'en', 'V', {
      slug: 'workspace-menu',
    }),
  },
];

export const PORTFOLIO_EXCLUSION_FIXTURES = {
  invalidDatasets: INVALID_DATASETS,
};
