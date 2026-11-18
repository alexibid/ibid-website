import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { StateService } from '../../application/state/state.service';

export const authGuard = () => {
  const router = inject(Router);
  const globalState = inject(StateService);

  if (globalState.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/admin/login']);
};
