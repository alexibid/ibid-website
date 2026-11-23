import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideContentRepositories } from './app.config';
import {
  ADMIN_CONTENT_REPOSITORY,
  CONTENT_READ_REPOSITORY
} from './infrastructure/tokens/content-repository.token';
import { StaticHtmlContentRepository } from './infrastructure/repositories/static-html-content.repository';
import { ApiContentRepository } from './infrastructure/repositories/api-content.repository';

describe('app.config content repository providers', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should provide StaticHtmlContentRepository for CONTENT_READ_REPOSITORY and ApiContentRepository for ADMIN_CONTENT_REPOSITORY in static mode', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideContentRepositories('static')
      ]
    });

    const readRepo = TestBed.inject(CONTENT_READ_REPOSITORY);
    const adminRepo = TestBed.inject(ADMIN_CONTENT_REPOSITORY);
    expect(readRepo).toBeInstanceOf(StaticHtmlContentRepository);
    expect(adminRepo).toBeInstanceOf(ApiContentRepository);
  });

  it('should bind ADMIN_CONTENT_REPOSITORY to the database-writing ApiContentRepository in development api mode', () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideContentRepositories('api')
      ]
    });

    const readRepo = TestBed.inject(CONTENT_READ_REPOSITORY);
    const adminRepo = TestBed.inject(ADMIN_CONTENT_REPOSITORY);
    expect(readRepo).toBeInstanceOf(ApiContentRepository);
    expect(adminRepo).toBeInstanceOf(ApiContentRepository);
  });
});
