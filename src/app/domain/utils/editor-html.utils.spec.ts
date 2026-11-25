import { normalizeEditorHtml } from './editor-html.utils';

describe('normalizeEditorHtml', () => {
  it('turns every non-breaking space into a normal space so text can wrap', () => {
    const html = '<p>De&nbsp;1999&nbsp;a\u00a02017</p>';

    expect(normalizeEditorHtml(html)).toBe('<p>De 1999 a 2017</p>');
  });

  it('drops empty paragraphs left at the end of the content', () => {
    const html = '<p>Text</p><p></p><p><br></p>';

    expect(normalizeEditorHtml(html)).toBe('<p>Text</p>');
  });

  it('keeps empty paragraphs between blocks of text', () => {
    const html = '<p>One</p><p></p><p>Two</p>';

    expect(normalizeEditorHtml(html)).toBe(html);
  });
});
