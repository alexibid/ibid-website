import type { ImageDimensions, ImageDimensionsBySource } from './image-dimensions.util';

interface ImageAttribute {
  readonly name: string;
  readonly value: string;
}

const IMAGE_TAG = /<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
const IMAGE_ATTRIBUTE = /([^\s"'=<>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const CAPTION_ATTRIBUTE = 'data-caption';
const DIMENSION_ATTRIBUTES: readonly string[] = ['width', 'height'];
const COVER_IMAGE_CLASS = 'img-feature';

export function enrichPageImages(html: string, dimensions: ImageDimensionsBySource): string {
  return html.replace(IMAGE_TAG, (tag) => renderImage(parseImageAttributes(tag), dimensions));
}

function renderImage(
  attributes: readonly ImageAttribute[],
  dimensions: ImageDimensionsBySource,
): string {
  const size = dimensions.get(attributeValue(attributes, 'src'));
  const image = `<img${serializeAttributes(withRealSize(attributes, size))}>`;
  const caption = attributeValue(attributes, CAPTION_ATTRIBUTE).trim();
  return caption.length > 0 && !isCoverImage(attributes) ? wrapInFigure(image, caption) : image;
}

function parseImageAttributes(tag: string): readonly ImageAttribute[] {
  const inner = tag.slice('<img'.length, tag.endsWith('/>') ? -2 : -1);
  return Array.from(inner.matchAll(IMAGE_ATTRIBUTE), (match) => ({
    name: match[1].toLowerCase(),
    value: match[2] ?? escapeQuotes(match[3] ?? match[4] ?? ''),
  }));
}

function withRealSize(
  attributes: readonly ImageAttribute[],
  size: ImageDimensions | undefined,
): readonly ImageAttribute[] {
  const kept = attributes.filter(
    (attribute) =>
      attribute.name !== CAPTION_ATTRIBUTE &&
      !(size !== undefined && DIMENSION_ATTRIBUTES.includes(attribute.name)),
  );
  if (size === undefined) {
    return kept;
  }
  return [
    ...kept,
    { name: 'width', value: String(size.width) },
    { name: 'height', value: String(size.height) },
  ];
}

function wrapInFigure(image: string, caption: string): string {
  const text = caption.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const figcaption = `<figcaption class="cms-figure__caption">${text}</figcaption>`;
  return `<figure class="cms-figure">${image}${figcaption}</figure>`;
}

function isCoverImage(attributes: readonly ImageAttribute[]): boolean {
  return attributeValue(attributes, 'class').split(/\s+/).includes(COVER_IMAGE_CLASS);
}

function attributeValue(attributes: readonly ImageAttribute[], name: string): string {
  return attributes.find((attribute) => attribute.name === name)?.value ?? '';
}

function serializeAttributes(attributes: readonly ImageAttribute[]): string {
  return attributes.map((attribute) => ` ${attribute.name}="${attribute.value}"`).join('');
}

function escapeQuotes(value: string): string {
  return value.replace(/"/g, '&quot;');
}
