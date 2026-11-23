export interface PortfolioMockEntry {
  readonly id: string;
  readonly type: 'home' | 'chapter' | 'exit';
  readonly lang: 'pt' | 'en' | 'es' | 'fr' | 'de';
  readonly location: string;
  readonly slug: string;
  readonly title: string;
  readonly content: string;
  readonly metadata: { readonly location: string };
}

type LangCode = 'pt' | 'en' | 'es' | 'fr' | 'de';

const LANGUAGES: readonly LangCode[] = ['pt', 'en', 'es', 'fr', 'de'];
const CHAPTER_LOCATIONS: readonly string[] = [
  'I',
  'II',
  'III',
  'IV',
  'V',
  'VI',
  'VII',
  'VIII',
  'IX',
  'X',
  'XI',
];

const EXIT_SLUGS: Record<LangCode, string> = {
  pt: 'contactos',
  en: 'contacts',
  es: 'contacto',
  fr: 'coordonnees',
  de: 'kontakt',
};

const INDEX_SLUGS: Record<LangCode, string> = {
  pt: 'indice',
  en: 'index',
  es: 'indice-es',
  fr: 'sommaire',
  de: 'inhalt',
};

function buildLanguageEntries(lang: LangCode): PortfolioMockEntry[] {
  const homeEntries: PortfolioMockEntry[] = [
    {
      id: `${lang}-home-front-cover`,
      type: 'home',
      lang,
      location: 'front-cover',
      slug: '',
      title: `Portfolio ${lang.toUpperCase()}`,
      content: '<p>Arquitetura e Sistemas Digitais</p>',
      metadata: { location: 'front-cover' },
    },
    {
      id: `${lang}-home-index`,
      type: 'home',
      lang,
      location: 'index',
      slug: INDEX_SLUGS[lang],
      title: `Index ${lang.toUpperCase()}`,
      content: '<p>1</p>',
      metadata: { location: 'index' },
    },
    {
      id: `${lang}-home-preface`,
      type: 'home',
      lang,
      location: 'preface',
      slug: '',
      title: `Preface ${lang.toUpperCase()}`,
      content: '<p>Habitação contemporânea e software.</p>',
      metadata: { location: 'preface' },
    },
  ];

  const chapterEntries: PortfolioMockEntry[] = CHAPTER_LOCATIONS.map((loc) => ({
    id: `${lang}-chapter-${loc.toLowerCase()}`,
    type: 'chapter',
    lang,
    location: loc,
    slug: `${lang}-chapter-${loc.toLowerCase()}`,
    title: loc === 'X' ? `Solum ${lang.toUpperCase()}` : `Chapter ${loc} ${lang.toUpperCase()}`,
    content:
      loc === 'X'
        ? '<p>Solum integra o projeto arquitetónico e a engenharia digital.</p><img src="https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=1200" alt="Solum view">'
        : '<p>Colaboração com WS, P4, qb arquitectura + design e Grupo Sosoares.</p><img src="https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=1200" alt="Atelier work">',
    metadata: { location: loc },
  }));

  const exitLocations: readonly string[] = ['about', 'contact-form', 'back-cover'];
  const exitEntries: PortfolioMockEntry[] = exitLocations.map((loc) => ({
    id: `${lang}-exit-${loc}`,
    type: 'exit',
    lang,
    location: loc,
    slug: EXIT_SLUGS[lang],
    title: `${loc} ${lang.toUpperCase()}`,
    content: `<p>Secção ${loc} em ${lang}.</p>`,
    metadata: { location: loc },
  }));

  return [...homeEntries, ...chapterEntries, ...exitEntries];
}

function buildValidDataset(): PortfolioMockEntry[] {
  return LANGUAGES.flatMap(buildLanguageEntries);
}

function buildContentDirFiles(
  contentDir: string,
  entries: readonly PortfolioMockEntry[],
): Record<string, string> {
  const files: Record<string, string> = {};
  for (const lang of LANGUAGES) {
    files[`${contentDir}/${lang}.json`] = JSON.stringify(
      entries.filter((entry) => entry.lang === lang),
    );
  }
  return files;
}

function replaceFirstMatching(
  entries: readonly PortfolioMockEntry[],
  predicate: (entry: PortfolioMockEntry) => boolean,
  patch: Partial<PortfolioMockEntry>,
): PortfolioMockEntry[] {
  let replaced = false;
  return entries.map((entry) => {
    if (!replaced && predicate(entry)) {
      replaced = true;
      return { ...entry, ...patch };
    }
    return entry;
  });
}

function swapExitOrder(entries: readonly PortfolioMockEntry[], lang: LangCode): PortfolioMockEntry[] {
  const result = [...entries];
  const aboutIndex = result.findIndex((e) => e.lang === lang && e.location === 'about');
  const formIndex = result.findIndex((e) => e.lang === lang && e.location === 'contact-form');
  if (aboutIndex >= 0 && formIndex >= 0) {
    const temp = result[aboutIndex];
    result[aboutIndex] = result[formIndex];
    result[formIndex] = temp;
  }
  return result;
}

const VALID_DATASET = buildValidDataset();

export const ENCODING_FIXTURES = {
  dirtyUnicodeAndQuotesHtml:
    '"<p>Estrat\\u00e9gia, \\"Design\\" e Conte\\u00fados\\nNovo par\\u00e1grafo \\u2014 Solum</p>"',
  dirtyImageHtml:
    '"<p>Texto</p><img src=\\"https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=1200\\" alt=\\"Web design\\">"',
  cleanUtf8Html:
    '<p>Estratégia, "Design" e Conteúdos — Solum, habitação e précision française.</p>',
  cleanMultilineUtf8Html: '<p>Linha um</p>\n<p>Linha dois with ü, ß, ñ, ç</p>',
  dirtyArtifacts: [
    { label: 'escaped-unicode', value: '<p>Reabilita\\u00e7\\u00e3o</p>', context: 'pt:chapter:V' },
    { label: 'escaped-quote', value: '<p class=\\"lead\\">Texto</p>', context: 'en:chapter:I' },
    { label: 'escaped-newline', value: '<p>Primeiro</p>\\n<p>Segundo</p>', context: 'es:home:preface' },
    { label: 'outer-quotes', value: '"<p>Capa</p>"', context: 'fr:home:front-cover' },
  ],
  emptyValue: '',
  whitespaceValue: '   ',
  singleCharValue: '1',
};

export const PORTFOLIO_CONTENT_FIXTURES = {
  contentDir: '/workspace/apps/ibid-website/api/src/cli/content',
  languages: LANGUAGES,
  validEntries: VALID_DATASET,
  validContentFiles: buildContentDirFiles(
    '/workspace/apps/ibid-website/api/src/cli/content',
    VALID_DATASET,
  ),
  dirtyDbPages: [
    {
      id: 'dirty-pt-cover',
      title: '"Arquitetura e Sistemas"',
      content: '"<p>Estrat\\u00e9gia e \\"Design\\"\\nHabita\\u00e7\\u00e3o</p>"',
      type: 'home',
      lang: 'pt',
      location: 'front-cover',
      metadata: { location: 'front-cover' },
    },
    {
      id: 'dirty-pt-ch1',
      title: 'Web Design',
      content:
        '"<p>Conte\\u00fado</p><img src=\\"https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800\\" alt=\\"Clean\\">"',
      type: 'chapter',
      lang: 'pt',
      location: 'I',
      metadata: { location: 'I' },
    },
    {
      id: 'clean-en-cover',
      title: 'Cover EN',
      content: '<p>Already clean UTF-8 HTML</p>',
      type: 'home',
      lang: 'en',
      location: 'front-cover',
      metadata: { location: 'front-cover' },
    },
  ],
  preservedMediaRows: [
    {
      id: 'media-existing-1',
      filename: 'cover.webp',
      url: '/content-media/cover.webp',
      mimeType: 'image/webp',
      sizeBytes: 2048,
    },
  ],
  invalidMissingLanguage: VALID_DATASET.filter((e) => e.lang !== 'de'),
  invalidMissingSolum: replaceFirstMatching(
    VALID_DATASET,
    (e) => e.lang === 'pt' && e.location === 'X',
    { title: 'Software', content: '<p>Ferramenta digital genérica.</p>' },
  ),
  invalidClientName: replaceFirstMatching(
    VALID_DATASET,
    (e) => e.lang === 'pt' && e.location === 'IV',
    { content: '<p>Projeto realizado para Unitel e Vodacom.</p>' },
  ),
  invalidBrokenImageSlot: replaceFirstMatching(
    VALID_DATASET,
    (e) => e.lang === 'en' && e.location === 'V',
    { content: '<p>Texto</p><img src="DRIVE/CACILHAS/render.png" alt="Broken">' },
  ),
  invalidDraftMarker: replaceFirstMatching(
    VALID_DATASET,
    (e) => e.lang === 'fr' && e.location === 'II',
    { content: '<p>[CAPTURA A FAZER]</p>' },
  ),
  invalidEmailLeak: replaceFirstMatching(
    VALID_DATASET,
    (e) => e.lang === 'es' && e.location === 'about',
    { content: '<p>Contacto: person@example.com</p>' },
  ),
  invalidEncodingArtifact: replaceFirstMatching(
    VALID_DATASET,
    (e) => e.lang === 'de' && e.location === 'I',
    { content: '<p>Architektur \\u00fcber alles</p>' },
  ),
  invalidFrontCoverSlug: replaceFirstMatching(
    VALID_DATASET,
    (e) => e.lang === 'pt' && e.location === 'front-cover',
    { slug: 'capa' },
  ),
  invalidPtExitSlug: replaceFirstMatching(
    VALID_DATASET,
    (e) => e.lang === 'pt' && e.location === 'about',
    { slug: 'contacts' },
  ),
  invalidExitOrder: swapExitOrder(VALID_DATASET, 'pt'),
};
