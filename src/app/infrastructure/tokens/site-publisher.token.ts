import { InjectionToken, inject } from '@angular/core';
import type { SitePublisherPort } from '../../domain/ports/site-publisher.port';
import { ApiSitePublisher } from '../services/api-site-publisher.service';

export const SITE_PUBLISHER = new InjectionToken<SitePublisherPort>('SITE_PUBLISHER', {
  providedIn: 'root',
  factory: () => inject(ApiSitePublisher)
});
