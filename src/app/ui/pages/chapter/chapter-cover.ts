import { toFeaturePictures } from '../../../domain/utils/feature-picture.utils';

export interface ChapterParts {
  readonly cover: string;
  readonly body: string;
}

const FEATURE_IMAGE = String.raw`<img\b[^>]*\bimg-feature\b[^>]*>`;
const OPENING_FEATURE = new RegExp(`${FEATURE_IMAGE}(?:\\s*${FEATURE_IMAGE})*`);

export function splitChapterCover(content: string): ChapterParts {
  const cover = OPENING_FEATURE.exec(content)?.[0] ?? '';
  return { cover: toFeaturePictures(cover), body: toFeaturePictures(content.replace(cover, '')) };
}

export function prependProbeCover(probe: HTMLElement, cover: string): void {
  if (!cover) return;
  const element = document.createElement('div');
  element.className = 'page-body';
  element.innerHTML = cover;
  probe.prepend(element);
}
