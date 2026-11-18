const PB = 'http://127.0.0.1:8090/api/files/xcmbvrw26p81y08';

function pageRecord(id: string, type: string, lang: string, location: string, content = '<p>texto</p>') {
  return { id, collectionId: 'xcmbvrw26p81y08', title: `${type} ${lang} ${location}`, content, type, lang, metadata: { location } };
}

export const MOCK_POCKETBASE_PAGES: readonly unknown[] = [
  pageRecord('pbhome00000pt01', 'home', 'pt', 'front-cover'),
  pageRecord('pbhome00000en01', 'home', 'en', 'front-cover'),
  pageRecord('pbchap00000pt01', 'chapter', 'pt', 'preface', `<p><img src="${PB}/media01/cover_ab12.webp?thumb=800x0"></p>`),
  pageRecord('pbchap00000pt02', 'chapter', 'pt', 'about'),
  pageRecord('pbchap00000fr01', 'chapter', 'fr', 'preface'),
  pageRecord('pbexit00000es01', 'exit', 'es', 'back-cover'),
];

export const MOCK_POCKETBASE_URLS: readonly unknown[] = [
  { id: 'pburl000000001', url: 'prefacio', lang: 'pt', page_id: 'pbchap00000pt01' },
  { id: 'pburl000000002', url: 'sobre', lang: 'pt', page_id: 'pbchap00000pt02' },
];

export const MOCK_POCKETBASE_MEDIA = [
  { fileName: 'cover_ab12.webp', mime: 'image/webp', alt: 'capa', bytes: new Uint8Array([1, 2, 3]) },
] as const;

export const MOCK_EXPECTED_COUNTS = {
  'chapter/fr': 1,
  'chapter/pt': 2,
  'exit/es': 1,
  'home/en': 1,
  'home/pt': 1,
} as const;

export const MOCK_BROKEN_RECORDS: readonly unknown[] = [
  null,
  'page',
  { id: 'x', title: 'no type', lang: 'pt' },
  { id: 'x', title: 't', type: 'blog', lang: 'pt', content: '' },
  { id: 'x', title: 't', type: 'home', lang: 'de', content: '' },
  { title: 't', type: 'home', lang: 'pt', content: '' },
];
