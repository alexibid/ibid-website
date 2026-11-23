import { RenderMode, ServerRoute } from '@angular/ssr';
import { PUBLIC_SERVER_ROUTES } from './app.routes.server.public';

export const serverRoutes: ServerRoute[] = [
  { path: 'admin', renderMode: RenderMode.Client },
  { path: 'admin/**', renderMode: RenderMode.Client },
  ...PUBLIC_SERVER_ROUTES
];
