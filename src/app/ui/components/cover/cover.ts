import {Component, input, ChangeDetectionStrategy } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { StaticHtmlDirective } from '../../directives/static-html.directive';
import { CmsPage } from '../../../domain/models/cms.interface';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-cover',
  standalone: true,
  imports: [NgTemplateOutlet, StaticHtmlDirective],
  templateUrl: './cover.html',
  host: {
    class: 'cover'
  }
})
export class Cover {
  public data = input.required<CmsPage>();
  public isBack = input<boolean>(false);
  public fullSpread = input<boolean>(false);
  public isHeading = input<boolean>(true);
}
