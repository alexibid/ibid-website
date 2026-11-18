import {Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StateService } from '../../../../application/state/state.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'website-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.scss'
})
export class AdminLogin {
  private globalState = inject(StateService);
  private router = inject(Router);

  public email = '';
  public password = '';
  public error = signal<string | null>(null);

  public async onSubmit(): Promise<void> {
    this.error.set(null);
    try {
      const ok = await this.globalState.login(this.password);
      if (ok) {
        this.router.navigate(['/admin']);
      } else {
        this.error.set('Incorrect password.');
      }
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Cannot reach API.');
    }
  }
}
