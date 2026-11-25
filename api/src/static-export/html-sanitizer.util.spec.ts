import { SANITIZER_IMAGE_FIXTURES } from '../mocks/portfolio-image-sources.mock';
import { HTML_SANITIZER_FIXTURES } from '../mocks/static-export-fixtures.mock';
import { sanitizePageHtml } from './html-sanitizer.util';

describe('sanitizePageHtml', () => {
  it('should preserve legitimate portfolio and Quill HTML elements including headings, paragraphs, figure.media-slot, div.project-card, and tables', () => {
    const sanitized = sanitizePageHtml(HTML_SANITIZER_FIXTURES.legitimatePortfolioHtml);

    expect(sanitized).toContain('<h1>Title One</h1>');
    expect(sanitized).toContain('<h2>Title Two</h2>');
    expect(sanitized).toContain('<h3>Title Three</h3>');
    expect(sanitized).toContain('<h4>Title Four</h4>');
    expect(sanitized).toContain('<h5>Title Five</h5>');
    expect(sanitized).toContain('<h6>Title Six</h6>');
    expect(sanitized).toContain('<strong>bold</strong>');
    expect(sanitized).toContain('<em>italic</em>');
    expect(sanitized).toContain('<ul><li>Item A</li></ul>');
    expect(sanitized).toContain('<ol><li>Step 1</li></ol>');
    expect(sanitized).toContain('<blockquote>Quoted manifesto</blockquote>');
    expect(sanitized).toContain('<div class="project-card">');
    expect(sanitized).toContain('<figure class="media-slot" id="media-slot-ch10-solum-manifesto">');
    expect(sanitized).toContain('<figcaption>Solum</figcaption>');
    expect(sanitized).toContain('<table>');
    expect(sanitized).toContain('<thead>');
    expect(sanitized).toContain('<tbody>');
    expect(sanitized).toContain('<th>Metric</th>');
    expect(sanitized).toContain('<td>100</td>');
  });

  it('should preserve safe anchor href and image src attributes on legitimate HTML', () => {
    const sanitized = sanitizePageHtml(HTML_SANITIZER_FIXTURES.legitimatePortfolioHtml);

    expect(sanitized).toContain('href="https://github.com/alexibid/ibid-website"');
    expect(sanitized).toContain('href="/pt/capitulo-1"');
    expect(sanitized).toContain('src="/content-media/hero.webp"');
    expect(sanitized).toContain('src="https://images.unsplash.com/photo-1"');
    expect(sanitized).toContain('alt="Hero"');
  });

  it('should strip script, style, iframe, and svg tags along with their unsafe payloads', () => {
    const scriptOut = sanitizePageHtml(HTML_SANITIZER_FIXTURES.xssPayloads.scriptTag);
    const styleOut = sanitizePageHtml(HTML_SANITIZER_FIXTURES.xssPayloads.styleTag);
    const iframeOut = sanitizePageHtml(HTML_SANITIZER_FIXTURES.xssPayloads.iframeTag);
    const svgOut = sanitizePageHtml(HTML_SANITIZER_FIXTURES.xssPayloads.svgTag);

    expect(scriptOut).toContain('<p>Safe</p>');
    expect(scriptOut).toContain('<p>After</p>');
    expect(scriptOut.toLowerCase()).not.toContain('<script');
    expect(scriptOut).not.toContain('alert(1)');

    expect(styleOut).toContain('<p>Visible</p>');
    expect(styleOut.toLowerCase()).not.toContain('<style');
    expect(styleOut.toLowerCase()).not.toContain('javascript:');

    expect(iframeOut).toContain('<p>Before</p>');
    expect(iframeOut.toLowerCase()).not.toContain('<iframe');

    expect(svgOut).toContain('<p>Text</p>');
    expect(svgOut.toLowerCase()).not.toContain('<svg');
    expect(svgOut.toLowerCase()).not.toContain('onload');
  });

  it('should strip inline on* event handler attributes while preserving valid element markup', () => {
    const sanitized = sanitizePageHtml(HTML_SANITIZER_FIXTURES.xssPayloads.eventHandlers);

    expect(sanitized).toContain('<p>Click</p>');
    expect(sanitized).toContain('src="/content-media/a.png"');
    expect(sanitized.toLowerCase()).not.toContain('onclick');
    expect(sanitized.toLowerCase()).not.toContain('onmouseover');
    expect(sanitized.toLowerCase()).not.toContain('onerror');
    expect(sanitized).not.toContain('alert(');
  });

  it('should strip javascript: and data: URIs including mixed-case and leading-whitespace variants', () => {
    const jsOut = sanitizePageHtml(HTML_SANITIZER_FIXTURES.xssPayloads.javascriptUri);
    const dataOut = sanitizePageHtml(HTML_SANITIZER_FIXTURES.xssPayloads.dataUri);
    const mixedOut = sanitizePageHtml(HTML_SANITIZER_FIXTURES.xssPayloads.mixedCaseAndWhitespaceUri);

    expect(jsOut.toLowerCase()).not.toContain('javascript:');
    expect(dataOut.toLowerCase()).not.toContain('data:');
    expect(mixedOut.toLowerCase()).not.toContain('javascript:');
  });

  it('should strip HTML comments from sanitized output', () => {
    const sanitized = sanitizePageHtml(HTML_SANITIZER_FIXTURES.xssPayloads.htmlComments);

    expect(sanitized).toContain('<p>Clean</p>');
    expect(sanitized).not.toContain('<!--');
    expect(sanitized).not.toContain('-->');
    expect(sanitized).not.toContain('hidden payload');
  });

  it('should handle empty, whitespace-only, plain text, and deeply nested safe HTML cleanly', () => {
    expect(sanitizePageHtml(HTML_SANITIZER_FIXTURES.emptyHtml)).toBe('');
    expect(sanitizePageHtml(HTML_SANITIZER_FIXTURES.whitespaceHtml)).toBe('');
    expect(sanitizePageHtml(HTML_SANITIZER_FIXTURES.plainText)).toBe(HTML_SANITIZER_FIXTURES.plainText);
    expect(sanitizePageHtml(HTML_SANITIZER_FIXTURES.deeplyNestedSafeHtml)).toBe(
      HTML_SANITIZER_FIXTURES.deeplyNestedSafeHtml
    );
  });

  it('should keep image src values served from the /images/ folder while stripping event handlers', () => {
    const sanitized = sanitizePageHtml(SANITIZER_IMAGE_FIXTURES.imagesFolderHtml);

    expect(sanitized).toContain('src="/images/hero.webp"');
    expect(sanitized.toLowerCase()).not.toContain('onerror');
  });
});
