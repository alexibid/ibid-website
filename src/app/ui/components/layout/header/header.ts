import { Component, ChangeDetectionStrategy, ElementRef, computed, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LangSelector } from '../lang-selector/lang-selector';
import { Settings } from '../settings/settings';
import { BookmarkNav } from '../bookmark-nav/bookmark-nav';
import { ClickOutsideDirective } from '../../../directives/click-outside.directive';

type MenuState = 'closed' | 'previewing' | 'pinned';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-header',
  standalone: true,
  imports: [CommonModule, LangSelector, Settings, BookmarkNav, ClickOutsideDirective],
  templateUrl: './header.html',
  host: {
    '(document:keydown.escape)': 'dismissMenu()'
  }
})
export class Header {
  private readonly menuState = signal<MenuState>('closed');
  private readonly menuTrigger = viewChild.required<ElementRef<HTMLButtonElement>>('menuTrigger');

  protected readonly isMenuOpen = computed(() => this.menuState() !== 'closed');

  protected toggleMenu(): void {
    this.menuState.update((state) => (state === 'pinned' ? 'closed' : 'pinned'));
  }

  protected previewMenu(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && this.menuState() === 'closed') {
      this.menuState.set('previewing');
    }
  }

  protected endPreview(event: PointerEvent): void {
    if (event.pointerType === 'mouse' && this.menuState() === 'previewing') {
      this.menuState.set('closed');
    }
  }

  protected pinPreview(): void {
    if (this.menuState() === 'previewing') {
      this.menuState.set('pinned');
    }
  }

  protected closeWhenFocusLeaves(event: FocusEvent): void {
    const container = event.currentTarget;
    const nextFocus = event.relatedTarget;
    const staysInside = container instanceof Node && nextFocus instanceof Node && container.contains(nextFocus);
    if (!staysInside && nextFocus !== null) {
      this.closeMenu();
    }
  }

  protected dismissMenu(): void {
    if (!this.isMenuOpen()) return;
    this.closeMenu();
    this.menuTrigger().nativeElement.focus();
  }

  protected closeMenu(): void {
    this.menuState.set('closed');
  }
}
