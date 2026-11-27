export interface ChapterParts {
  readonly cover: string;
  readonly body: string;
}

const FEATURE_IMAGE = String.raw`<img\b[^>]*\bimg-feature\b[^>]*>`;
const OPENING_FEATURE = new RegExp(`${FEATURE_IMAGE}(?:\\s*${FEATURE_IMAGE})*`);

export function splitChapterCover(content: string): ChapterParts {
  const cover = OPENING_FEATURE.exec(content)?.[0] ?? '';
  return { cover, body: content.replace(cover, '') };
}

export function prependProbeCover(probe: HTMLElement, cover: string, scopeAttribute: string): void {
  if (!cover) return;
  const element = document.createElement('div');
  element.className = 'page-body';
  element.innerHTML = cover;
  if (scopeAttribute) element.setAttribute(scopeAttribute, '');
  probe.prepend(element);
}
