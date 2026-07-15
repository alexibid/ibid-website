import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { StateService } from '../../../core/services/state.service';

@Component({
  selector: 'app-admin-login',
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

  public onSubmit() {
    this.error.set(null);
    if (this.globalState.login(this.password)) {
      this.router.navigate(['/admin']);
    } else {
      this.error.set('Incorrect password.');
    }
  }
}
