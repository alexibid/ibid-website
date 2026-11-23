import { ServerRoute } from '@angular/ssr';
import { PUBLIC_SERVER_ROUTES } from './app.routes.server.public';

export const serverRoutes: ServerRoute[] = [...PUBLIC_SERVER_ROUTES];
