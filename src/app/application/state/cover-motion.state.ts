import { Injectable, Signal, computed, effect, inject, signal } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { BookService } from '../../infrastructure/services/book.service';
import { PageType } from '../../domain/models/page-type.enum';

export type CoverPosition = 'closed' | 'open';

@Injectable({ providedIn: 'root' })
export class CoverMotionState {
  private readonly bookService = inject(BookService);
  private readonly position = signal<CoverPosition>('closed');
  private readonly landing = new Subject<void>();

  public readonly isOpen: Signal<boolean> = computed(() => this.position() === 'open');
  public readonly landed: Observable<void> = this.landing.asObservable();

  constructor() {
    effect(() => this.resetAwayFromHome());
  }

  public open(): void {
    this.position.set('open');
  }

  public close(): void {
    this.position.set('closed');
  }

  public land(): void {
    this.landing.next();
  }

  private resetAwayFromHome(): void {
    if (this.bookService.activePageType() === PageType.Home) return;
    this.close();
  }
}
