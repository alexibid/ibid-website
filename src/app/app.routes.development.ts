import { Routes } from '@angular/router';
import { AdminLayout } from './ui/layouts/admin-layout/admin-layout';
import { PUBLIC_ROUTES } from './app.routes.public';

export const routes: Routes = [
  {
    path: 'admin',
    component: AdminLayout,
    loadChildren: async () => (await import('./ui/pages/admin/admin.routes')).default
  },
  ...PUBLIC_ROUTES
];
