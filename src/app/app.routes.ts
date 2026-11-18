import { Routes } from '@angular/router';
import { AdminLayout } from './ui/layouts/admin-layout/admin-layout';
import { FrontofficeLayout } from './ui/layouts/frontoffice-layout/frontoffice-layout';
import { authGuard } from './infrastructure/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'admin/login',
    loadComponent: async () => (await import('./ui/pages/admin/admin-login/admin-login')).AdminLogin
  },
  {
    path: 'admin',
    component: AdminLayout,
    canActivate: [authGuard],
    loadChildren: () => import('./ui/pages/admin/admin.routes')
  },
  {
    path: '',
    component: FrontofficeLayout,
    children: []
  },
  {
    path: '**',
    loadComponent: async () => (await import('./ui/components/not-found/not-found')).NotFound
  }
];
