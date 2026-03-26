import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'admin',
    loadChildren: () => import('./features/admin/admin.routes')
  },
  {
    path: '**',
    loadComponent: async () => (await import('./features/not-found/not-found')).NotFound
  }
];
