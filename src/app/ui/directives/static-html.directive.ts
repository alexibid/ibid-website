import { Directive, ElementRef, SecurityContext, effect, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

function contentSignature(root: ParentNode): string {
  const images = Array.from(root.querySelectorAll('img, source'), (node) => node.getAttribute('src') ?? node.getAttribute('srcset'));
  return `${(root.textContent ?? '').replace(/\s+/g, ' ').trim()}|${images.join(',')}`;
}

function signatureOfHtml(document: Document, html: string): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  return contentSignature(template.content);
}

@Directive({
  selector: '[websiteStaticHtml]',
  standalone: true
})
export class StaticHtmlDirective {
  public readonly websiteStaticHtml = input.required<string>();

  private readonly element: HTMLElement = inject(ElementRef<HTMLElement>).nativeElement;
  private readonly sanitizer = inject(DomSanitizer);
  private prerenderedSignature = this.element.childNodes.length > 0 ? contentSignature(this.element) : '';

  constructor() {
    effect(() => this.render(this.sanitizer.sanitize(SecurityContext.HTML, this.websiteStaticHtml()) ?? ''));
  }

  private render(html: string): void {
    if (this.keepsPrerendered(html)) return;
    this.prerenderedSignature = '';
    this.element.innerHTML = html;
  }

  private keepsPrerendered(html: string): boolean {
    if (!this.prerenderedSignature) return false;
    return html === '' || signatureOfHtml(this.element.ownerDocument, html) === this.prerenderedSignature;
  }
}
