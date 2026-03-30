import { Routes } from '@angular/router';

const ADMIN_LANG_SELECT = () => import('./admin-lang-select/admin-lang-select').then(m => m.AdminLangSelect);
const ADMIN_LIST        = () => import('./admin-list/admin-list');
const ADMIN_CREATE      = () => import('./admin-create/admin-create');
const ADMIN_READ        = () => import('./admin-read/admin-read');
const ADMIN_UPDATE      = () => import('./admin-update/admin-update');
const ADMIN_DELETE      = () => import('./admin-delete/admin-delete');

const routes: Routes = [
  { path: '',            loadComponent: ADMIN_LANG_SELECT },
  { path: 'create',      loadComponent: ADMIN_CREATE },
  { path: 'read/:id',    loadComponent: ADMIN_READ },
  { path: 'update/:id',  loadComponent: ADMIN_UPDATE },
  { path: 'delete/:id',  loadComponent: ADMIN_DELETE },
  { path: ':lang',       loadComponent: ADMIN_LIST }
];

export default routes;
