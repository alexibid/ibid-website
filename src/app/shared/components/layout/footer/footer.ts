import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StateService } from '../../../../core/services/state.service';
import { PageTurn } from '../page-turn/page-turn';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class Footer {
  public globalState = inject(StateService);
  public pageTurn = input.required<PageTurn>();
}
