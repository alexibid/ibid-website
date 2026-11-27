import {Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings.html'
})
export class Settings {
  public openSettings() {
    console.log('Settings opened');
  }
}
