import { Component, input } from '@angular/core';

/**
 * Cover view for front and back covers.
 */
@Component({
  selector: 'app-cover',
  standalone: true,
  templateUrl: './cover.html',
  styleUrl: './cover.scss',
  host: {
    '[class.back-cover]': 'isBack()'
  }
})
export class Cover {
  /** Cover data to render from CMS. */
  public data = input.required<any>();

  /** Whether this is the back cover. */
  public isBack = input<boolean>(false);

  /** Whether the cover should occupy the full spread (2 columns). */
  public fullSpread = input<boolean>(false);
}
