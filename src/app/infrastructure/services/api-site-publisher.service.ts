import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { isRecord } from '../../domain/models/static-routes.model';
import type { SitePublisherPort } from '../../domain/ports/site-publisher.port';
import { BYPASS_GLOBAL_ERROR } from '../interceptors/error.interceptor';
import { ApiUnreachableError } from '../repositories/api-content.repository';
import { API_BASE_URL } from '../tokens/api-base-url.token';

@Injectable({ providedIn: 'root' })
export class ApiSitePublisher implements SitePublisherPort {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${inject(API_BASE_URL).replace(/\/+$/, '')}/api/v1/publish`;

  async publish(): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post<unknown>(this.endpoint, {}, {
          context: new HttpContext().set(BYPASS_GLOBAL_ERROR, true)
        })
      );
    } catch (error) {
      throw toPublishError(error);
    }
  }
}

function toPublishError(error: unknown): Error {
  if (!(error instanceof HttpErrorResponse)) {
    return error instanceof Error ? error : new Error('Failed to publish the site.');
  }
  if (error.status === 0) {
    return new ApiUnreachableError();
  }
  const body: unknown = error.error;
  return isRecord(body) && typeof body['message'] === 'string'
    ? new Error(body['message'])
    : new Error(error.message || 'Failed to publish the site.');
}
