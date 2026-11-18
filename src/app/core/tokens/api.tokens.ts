import { InjectionToken } from '@angular/core';

export const SUPPORTED_LANGUAGES = new InjectionToken<readonly string[]>('SUPPORTED_LANGUAGES', {
  providedIn: 'root',
  factory: () => ['pt', 'en', 'es', 'fr'] as const,
});

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => 'http://127.0.0.1:4510/api/v1',
});
