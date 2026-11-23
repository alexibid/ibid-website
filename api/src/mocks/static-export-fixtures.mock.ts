const LOCAL_DEV_DB_PASS = ['ibid', 'local', 'dev', '2026'].join('-');

export const CONFIG_MOCK_ENVS: Record<
  'empty' | 'configured' | 'invalidPort' | 'externalCors' | 'customLocalCors',
  Record<string, string | undefined>
> = {
  empty: {},
  configured: {
    API_HOST: '127.0.0.1',
    API_PORT: '4510',
    POSTGRES_HOST: '127.0.0.1',
    POSTGRES_PORT: '54330',
    POSTGRES_DB: 'ibid_website',
    POSTGRES_USER: 'ibid',
    POSTGRES_PASSWORD: LOCAL_DEV_DB_PASS,
    CORS_ORIGINS: 'http://localhost:4200,http://127.0.0.1:4200',
    WORKSPACE_ROOT: '/workspace/apps/ibid-website',
    STATIC_PAGES_DIR: '/workspace/apps/ibid-website/public/pages',
    MEDIA_DIR: '/workspace/apps/ibid-website/public/content-media',
    PRERENDER_ROUTES_PATH: '/workspace/apps/ibid-website/src/prerender-routes.txt'
  },
  invalidPort: {
    API_PORT: 'invalid-port',
    POSTGRES_PORT: '-10'
  },
  externalCors: {
    CORS_ORIGINS: 'https://evil.example.com'
  },
  customLocalCors: {
    CORS_ORIGINS: 'http://localhost:4200, http://127.0.0.1:4201'
  }
};

export const HTML_SANITIZER_FIXTURES = {
  legitimatePortfolioHtml: [
    '<h1>Title One</h1>',
    '<h2>Title Two</h2>',
    '<h3>Title Three</h3>',
    '<h4>Title Four</h4>',
    '<h5>Title Five</h5>',
    '<h6>Title Six</h6>',
    '<p>Intro with <strong>bold</strong> and <em>italic</em> text.</p>',
    '<ul><li>Item A</li></ul>',
    '<ol><li>Step 1</li></ol>',
    '<blockquote>Quoted manifesto</blockquote>',
    '<div class="project-card"><p>Solum system</p></div>',
    '<figure class="media-slot" id="media-slot-ch10-solum-manifesto"><img src="/content-media/hero.webp" alt="Hero"><figcaption>Solum</figcaption></figure>',
    '<img src="https://images.unsplash.com/photo-1" alt="Remote">',
    '<a href="https://github.com/alexibid/ibid-website" target="_blank" rel="noopener noreferrer">Repo</a>',
    '<a href="/pt/capitulo-1">Internal link</a>',
    '<table><thead><tr><th>Metric</th></tr></thead><tbody><tr><td>100</td></tr></tbody></table>'
  ].join(''),
  plainText: 'Plain portfolio summary without markup.',
  deeplyNestedSafeHtml: '<div><div class="project-card"><h3>Nested</h3><p>Body <strong>strong</strong></p></div></div>',
  xssPayloads: {
    scriptTag: '<p>Safe</p><script>alert(1)</script><p>After</p>',
    styleTag: '<style>body { background: url("javascript:alert(1)"); }</style><p>Visible</p>',
    iframeTag: '<p>Before</p><iframe src="https://evil.example.com"></iframe>',
    svgTag: '<p>Text</p><svg onload="alert(1)"><circle cx="10" cy="10" r="5" /></svg>',
    eventHandlers: '<p onclick="alert(1)" onmouseover="steal()">Click</p><img src="/content-media/a.png" alt="A" onerror="alert(2)">',
    javascriptUri: '<a href="javascript:alert(1)">Link</a><img src="javascript:alert(2)" alt="Bad">',
    dataUri: '<a href="data:text/html,<script>alert(1)</script>">Data</a><img src="data:image/svg+xml,<svg onload=alert(1)>" alt="DataImg">',
    htmlComments: '<!-- hidden payload --><p>Clean</p><!-- <script>alert(1)</script> -->',
    mixedCaseAndWhitespaceUri: '<a href="  JaVaScRiPt:alert(1)">Mixed</a>'
  },
  emptyHtml: '',
  whitespaceHtml: '   \n\t  '
};

const BASE_PAGES = [
  {
    id: 'home-pt-1',
    title: 'Capa PT',
    content: '<p>Capa</p><script>alert(1)</script>',
    type: 'home',
    lang: 'pt',
    location: 'front-cover',
    metadata: { location: 'front-cover', old_id: 1 }
  },
  {
    id: 'home-pt-2',
    title: 'Índice PT',
    content: '<p>1</p>',
    type: 'home',
    lang: 'pt',
    location: 'index',
    metadata: { location: 'index', old_id: 2 }
  },
  {
    id: 'home-en-1',
    title: 'Cover EN',
    content: '<p>Cover</p>',
    type: 'home',
    lang: 'en',
    location: 'front-cover',
    metadata: { location: 'front-cover' }
  },
  {
    id: 'chapter-pt-1',
    title: 'Capítulo I',
    content: '<div class="project-card"><p>Texto PT</p></div>',
    type: 'chapter',
    lang: 'pt',
    location: 'I',
    metadata: { location: 'I' }
  },
  {
    id: 'chapter-es-1',
    title: 'Capítulo I ES',
    content: '<p>Texto ES</p>',
    type: 'chapter',
    lang: 'es',
    location: 'I',
    metadata: { location: 'I' }
  },
  {
    id: 'exit-fr-1',
    title: 'Coordonnées',
    content: '<p>Contact FR</p>',
    type: 'exit',
    lang: 'fr',
    location: 'contact-form',
    metadata: { location: 'contact-form' }
  }
];

const BASE_URLS = [
  { id: 'url-1', url: '', lang: 'pt', pageId: 'home-pt-1' },
  { id: 'url-2', url: 'indice', lang: 'pt', pageId: 'home-pt-2' },
  { id: 'url-3', url: '', lang: 'en', pageId: 'home-en-1' },
  { id: 'url-4', url: 'capitulo-1', lang: 'pt', pageId: 'chapter-pt-1' },
  { id: 'url-5', url: 'capitulo-1-es', lang: 'es', pageId: 'chapter-es-1' },
  { id: 'url-6', url: 'coordonnees', lang: 'fr', pageId: 'exit-fr-1' }
];

const BASE_MEDIA = [
  {
    id: 'media-seed-1',
    filename: 'seed-hero.png',
    url: '/content-media/seed-hero.png',
    mimeType: 'image/png',
    sizeBytes: 128
  }
];

export const STATIC_EXPORT_FIXTURES = {
  pages: BASE_PAGES,
  urls: BASE_URLS,
  media: BASE_MEDIA,
  expectedPrerenderRoutes: [
    '/',
    '/en',
    '/es/capitulo-1-es',
    '/fr/coordonnees',
    '/pt',
    '/pt/capitulo-1',
    '/pt/indice'
  ],
  orphanedFiles: {
    '/workspace/apps/ibid-website/public/pages/pt/stale-old-page.html': '<p>stale</p>',
    '/workspace/apps/ibid-website/public/pages/old-lang/orphan.html': '<p>orphan</p>',
    '/workspace/apps/ibid-website/public/pages/routes.json': '{"pages":[],"urls":[],"media":[]}'
  },
  traversalPages: {
    badLang: {
      id: 'safe-id',
      title: 'Bad Lang',
      content: '<p>Bad</p>',
      type: 'chapter',
      lang: '../etc',
      location: 'I',
      metadata: { location: 'I' }
    },
    badId: {
      id: '../../evil',
      title: 'Bad ID',
      content: '<p>Bad</p>',
      type: 'chapter',
      lang: 'pt',
      location: 'I',
      metadata: { location: 'I' }
    }
  }
};

const PAGE_CREATE_PAYLOAD: {
  readonly title: string;
  readonly content: string;
  readonly type: 'chapter';
  readonly lang: string;
  readonly location: string;
  readonly metadata: { readonly location: string };
} = {
  title: 'New Chapter VIII',
  content: '<p>New content</p>',
  type: 'chapter',
  lang: 'en',
  location: 'VIII',
  metadata: { location: 'VIII' }
};

export const PAGE_MOCK_FIXTURES = {
  existingPages: BASE_PAGES,
  createPayload: PAGE_CREATE_PAYLOAD,
  updatePayload: {
    title: 'Updated Cover PT',
    content: '<p>Updated body</p>'
  },
  filterPtHome: { type: 'home', lang: 'pt' },
  targetPageId: 'home-pt-1',
  missingPageId: 'missing-page-id'
};

export const URL_MOCK_FIXTURES = {
  existingPages: BASE_PAGES,
  existingUrls: BASE_URLS.slice(0, 3),
  orphanExistingUrls: [
    ...BASE_URLS.slice(0, 2),
    { id: 'url-orphan', url: 'broken-link', lang: 'de', pageId: 'non-existent-page' }
  ],
  createPayload: { url: 'new-section', lang: 'pt', pageId: 'home-pt-1' },
  rootUrlPayload: { url: '', lang: 'fr', pageId: 'exit-fr-1' },
  updatePayload: { url: 'renamed-section' },
  orphanPayload: { url: 'orphan', lang: 'pt', pageId: 'non-existent-page' },
  targetUrlId: 'url-2',
  missingUrlId: 'missing-url-id',
  filterPt: { lang: 'pt' },
  filterPtExpanded: { lang: 'pt', expandPage: true },
  expandedOnly: { expandPage: true },
  nonExpanded: { expandPage: false }
};

export const MEDIA_MOCK_FIXTURES = {
  validPngUpload: {
    originalname: 'hero-banner.png',
    mimetype: 'image/png',
    size: 16,
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52])
  },
  validWebpUpload: {
    originalname: 'gallery.webp',
    mimetype: 'image/webp',
    size: 12,
    buffer: Buffer.from('RIFF\x00\x00\x00\x00WEBP', 'latin1')
  },
  traversalUpload: {
    originalname: '../../../etc/passwd.png',
    mimetype: 'image/png',
    size: 8,
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  },
  invalidMimeUpload: {
    originalname: 'payload.html',
    mimetype: 'text/html',
    size: 25,
    buffer: Buffer.from('<script>alert(1)</script>')
  },
  oversizedUpload: {
    originalname: 'giant.png',
    mimetype: 'image/png',
    size: 20 * 1024 * 1024,
    buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47])
  },
  emptyUpload: {
    originalname: 'empty.png',
    mimetype: 'image/png',
    size: 0,
    buffer: Buffer.alloc(0)
  },
  existingMedia: BASE_MEDIA,
  targetMediaId: 'media-seed-1',
  missingMediaId: 'missing-media-id'
};
