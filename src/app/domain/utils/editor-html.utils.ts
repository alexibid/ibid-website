const NON_BREAKING_SPACE = /&nbsp;|\u00a0/g;
const TRAILING_EMPTY_PARAGRAPHS = /(?:<p>(?:<br>)?<\/p>\s*)+$/;

export function normalizeEditorHtml(html: string): string {
  return html.replace(NON_BREAKING_SPACE, ' ').replace(TRAILING_EMPTY_PARAGRAPHS, '');
}
