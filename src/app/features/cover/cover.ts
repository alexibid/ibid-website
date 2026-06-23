import { Component, input } from '@angular/core';

/**
 * Cover view for front and back covers.
 */
@Component({
  selector: 'app-cover',
  standalone: true,
  templateUrl: './cover.html',
  styleUrl: './cover.scss'
})
export class Cover {
  public data = input.required<any>();
  public isBack = input<boolean>(false);
  public fullSpread = input<boolean>(false);
}
