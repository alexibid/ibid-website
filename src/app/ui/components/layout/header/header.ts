import {Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LangSelector } from '../lang-selector/lang-selector';
import { Settings } from '../settings/settings';
import { I18nService } from '../../../../infrastructure/services/i18n.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-header',
  standalone: true,
  imports: [CommonModule, RouterLink, LangSelector, Settings],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  public i18n = inject(I18nService);
}
