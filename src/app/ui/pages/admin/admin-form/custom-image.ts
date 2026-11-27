import Quill from 'quill';
import Image from 'quill/formats/image';

type ImageFormatClass = Omit<typeof Image, 'value'> & {
  new (...args: ConstructorParameters<typeof Image>): Image;
  value(domNode: Element): unknown;
};

interface ImageValue {
  readonly url?: string;
  readonly src?: string;
  readonly alt?: string;
  readonly class?: string;
  readonly width?: string;
  readonly caption?: string;
}

const CAPTION_ATTRIBUTE = 'data-caption';
const EDITABLE_ATTRIBUTES: readonly string[] = ['alt', CAPTION_ATTRIBUTE, 'class', 'width'];
const ImageFormat: ImageFormatClass = Image;

export class CustomImage extends ImageFormat {
  static override create(value: unknown): Element {
    const node = super.create(typeof value === 'string' ? value : '');
    if (typeof value === 'string') {
      node.setAttribute('src', value);
    } else if (isImageValue(value)) {
      applyImageValue(node, value);
    }
    return node;
  }

  static override value(node: Element): ImageValue {
    return {
      url: node.getAttribute('src') ?? undefined,
      alt: node.getAttribute('alt') ?? undefined,
      class: node.getAttribute('class') ?? undefined,
      width: node.getAttribute('width') ?? undefined,
      caption: node.getAttribute(CAPTION_ATTRIBUTE) ?? undefined,
    };
  }

  override format(name: string, value: string): void {
    if (!EDITABLE_ATTRIBUTES.includes(name)) {
      super.format(name, value);
      return;
    }
    if (value) {
      this.domNode.setAttribute(name, value);
      if (name === 'width') this.domNode.style.width = cssWidthOf(value);
    } else {
      this.domNode.removeAttribute(name);
      if (name === 'width') this.domNode.style.width = '';
    }
  }
}

Quill.register(CustomImage, true);

export function cssWidthOf(width: string): string {
  return width.endsWith('%') || width.endsWith('px') ? width : `${width}px`;
}

function isImageValue(value: unknown): value is ImageValue {
  return typeof value === 'object' && value !== null;
}

function applyImageValue(node: Element, value: ImageValue): void {
  node.setAttribute('src', value.url || value.src || '');
  if (value.alt) node.setAttribute('alt', value.alt);
  if (value.caption) node.setAttribute(CAPTION_ATTRIBUTE, value.caption);
  if (value.class) node.setAttribute('class', value.class);
  if (value.width && node instanceof HTMLElement) {
    node.setAttribute('width', value.width);
    node.style.width = cssWidthOf(value.width);
  }
}
