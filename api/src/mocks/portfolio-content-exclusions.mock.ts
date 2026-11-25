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

const STANDALONE_CHAPTER_DATASETS: readonly InvalidExclusionDataset[] = [
  {
    label: 'standalone-boilerplate-chapter',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'en', 'IV', {
      slug: 'boilerplate',
      title: 'Boilerplate',
      content: '<p>Standalone boilerplate setup chapter.</p>',
    }),
  },
  {
    label: 'standalone-ibid-ui-chapter-link',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'en', 'IV', {
      slug: 'ibid-ui',
      title: 'ibid-ui Design System',
      content: '<p>Component library at https://github.com/alexibid/ibid-ui.</p>',
    }),
  },
  {
    label: 'standalone-ibid-workspace-chapter-link',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'en', 'V', {
      slug: 'ibid-workspace',
      title: 'ibid-workspace',
      content:
        '<p>Workspace library at https://github.com/alexibid/ibid-workspace/tree/main/libs/ibid-ui.</p>',
    }),
  },
  {
    label: 'standalone-extra-ibid-ui-chapter-x',
    entries: [
      ...PORTFOLIO_CONTENT_FIXTURES.validEntries,
      {
        id: 'en-chapter-x',
        type: 'chapter',
        lang: 'en',
        location: 'X',
        slug: 'ibid-ui',
        title: 'ibid-ui Design System',
        content: '<p>Standalone UI library chapter.</p>',
        metadata: { location: 'X' },
      },
    ],
  },
  {
    label: 'standalone-extra-ibid-workspace-chapter-xi',
    entries: patchEntry(PORTFOLIO_CONTENT_FIXTURES.validEntries, 'en', 'IX', {
      id: 'en-chapter-xi',
      location: 'XI',
      slug: 'ibid-workspace',
      title: 'ibid-workspace',
      content: '<p>Standalone workspace chapter.</p>',
      metadata: { location: 'XI' },
    }),
  },
];

export const PORTFOLIO_EXCLUSION_FIXTURES = {
  invalidDatasets: INVALID_DATASETS,
  standaloneChapterDatasets: STANDALONE_CHAPTER_DATASETS,
};
