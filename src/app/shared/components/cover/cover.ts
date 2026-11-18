import {Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CmsPage } from '../../types/cms.interface';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-cover',
  standalone: true,
  templateUrl: './cover.html',
  styleUrl: './cover.scss'
})
export class Cover {
  public data = input.required<CmsPage>();
  public isBack = input<boolean>(false);
  public fullSpread = input<boolean>(false);
}
