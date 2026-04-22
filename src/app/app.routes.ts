import { Routes } from '@angular/router';
import { AdminLayout } from './core/layouts/admin-layout/admin-layout';
import { FrontofficeLayout } from './core/layouts/frontoffice-layout/frontoffice-layout';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'admin/login',
    loadComponent: () => import('./features/admin/admin-login/admin-login').then(m => m.AdminLogin)
  },
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [authGuard],
    loadChildren: () => import('./features/admin/admin.routes')
  },
  {
    path: '',
    component: FrontofficeLayout,
    children: [] // Will be populated dynamically by RoutingService
  },
  {
    path: '**',
    loadComponent: async () => (await import('./features/not-found/not-found')).NotFound
  }
];
