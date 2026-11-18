import {Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, UpperCasePipe, TitleCasePipe } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { StateService } from '../../../application/state/state.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, UpperCasePipe, TitleCasePipe],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss'
})
export class AdminLayout {
  public globalState = inject(StateService);
}
