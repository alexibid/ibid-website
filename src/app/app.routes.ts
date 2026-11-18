import { Routes } from '@angular/router';
import { AdminLayout } from './core/layouts/admin-layout/admin-layout';
import { FrontofficeLayout } from './core/layouts/frontoffice-layout/frontoffice-layout';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'admin/login',
    loadComponent: async () => (await import('./domains/content-management/admin/admin-login/admin-login')).AdminLogin
  },
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [authGuard],
    loadChildren: () => import('./domains/content-management/admin/admin.routes')
  },
  {
    path: '',
    component: FrontofficeLayout,
    children: []
  },
  {
    path: '**',
    loadComponent: async () => (await import('./shared/components/not-found/not-found')).NotFound
  }
];

