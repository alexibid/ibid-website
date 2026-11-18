import { Directive, ElementRef, HostListener, inject, output } from '@angular/core';

@Directive({
  selector: '[websiteClickOutside]',
  standalone: true
})
export class ClickOutsideDirective {
  private readonly elementRef = inject(ElementRef);
  public readonly websiteClickOutside = output<void>();

  @HostListener('document:click', ['$event.target'])
  public onClick(target: EventTarget | null) {
    if (target instanceof Node) {
      const clickedInside = this.elementRef.nativeElement.contains(target);
      if (!clickedInside) {
        this.websiteClickOutside.emit();
      }
    }
  }
}
