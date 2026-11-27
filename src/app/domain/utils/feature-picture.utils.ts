const FEATURE_PAIR = /<img\b([^>]*\bimg-feature--desktop\b[^>]*)>\s*<img\b([^>]*\bimg-feature--mobile\b[^>]*)>/g;
const DESKTOP_MEDIA = '(min-width: 768px)';
const MOBILE_MODIFIER = /\s*\bimg-feature--mobile\b/;

function attributeOf(attributes: string, name: string): string {
  return new RegExp(`\\b${name}="([^"]*)"`).exec(attributes)?.[1] ?? '';
}

function desktopSource(attributes: string): string {
  const [srcset, width, height] = ['src', 'width', 'height'].map((name) => attributeOf(attributes, name));
  return `<source media="${DESKTOP_MEDIA}" srcset="${srcset}" width="${width}" height="${height}">`;
}

function featurePicture(desktopAttributes: string, mobileAttributes: string): string {
  const image = `<img${mobileAttributes.replace(MOBILE_MODIFIER, '')}>`;
  return `<picture class="img-feature-picture">${desktopSource(desktopAttributes)}${image}</picture>`;
}

export function toFeaturePictures(html: string): string {
  return html.replace(FEATURE_PAIR, (_pair, desktop: string, mobile: string) => featurePicture(desktop, mobile));
}
