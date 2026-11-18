import {Component, ChangeDetectionStrategy } from '@angular/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-admin-read',
  imports: [],
  template: ` <p>admin-read works!</p> `,
  styles: ``,
})
export default class AdminRead {}
