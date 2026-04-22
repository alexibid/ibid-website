import { Component, inject } from '@angular/core';
import { CommonModule, UpperCasePipe, TitleCasePipe } from '@angular/common';
import { RouterOutlet, RouterLink } from '@angular/router';
import { StateService } from '../../services/state.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, UpperCasePipe, TitleCasePipe],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss'
})
export class AdminLayout {
  public globalState = inject(StateService);
}
