import { InjectionToken } from '@angular/core';
import type {
  AdminContentRepository,
  ContentReadRepository
} from '../../domain/repositories/content.repository';

export const CONTENT_READ_REPOSITORY = new InjectionToken<ContentReadRepository>(
  'CONTENT_READ_REPOSITORY'
);

export const ADMIN_CONTENT_REPOSITORY = new InjectionToken<AdminContentRepository>(
  'ADMIN_CONTENT_REPOSITORY'
);
