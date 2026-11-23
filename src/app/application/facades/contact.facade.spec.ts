import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PageType } from '../../domain/models/page-type.enum';
import { CONTENT_READ_REPOSITORY } from '../../infrastructure/tokens/content-repository.token';
import { ContactFacade } from './contact.facade';
import {
  CONTACT_FORM_FIXTURES,
  createMockContentReadRepository,
  STATIC_HTML_FIXTURES,
  type ContentReadRepositoryMock
} from '../../../mocks/static-html.mock';

describe('ContactFacade', () => {
  let facade: ContactFacade;
  let mockRepo: ContentReadRepositoryMock;

  beforeEach(() => {
    mockRepo = createMockContentReadRepository();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        ContactFacade,
        { provide: CONTENT_READ_REPOSITORY, useValue: mockRepo }
      ]
    });
    facade = TestBed.inject(ContactFacade);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should load exit sections through CONTENT_READ_REPOSITORY', async () => {
    await facade.loadExitSections('pt');

    expect(mockRepo.loadSections).toHaveBeenCalledWith(PageType.Exit, 'pt');
    expect(facade.sections()).toEqual(STATIC_HTML_FIXTURES.exitSections);
  });

  it('should validate required fields and email format', () => {
    expect(facade.validateForm()).toBe(false);
    expect(facade.errors().name).toBe('Name is required');
    expect(facade.errors().email).toBe('Email is required');
    expect(facade.errors().message).toBe('Message is required');

    facade.name.set(CONTACT_FORM_FIXTURES.validName);
    facade.email.set(CONTACT_FORM_FIXTURES.invalidEmail);
    facade.message.set(CONTACT_FORM_FIXTURES.validMessage);
    expect(facade.validateForm()).toBe(false);
    expect(facade.errors().email).toBe('Invalid email address');

    facade.email.set(CONTACT_FORM_FIXTURES.validEmail);
    expect(facade.validateForm()).toBe(true);
    expect(facade.errors().name).toBeUndefined();
    expect(facade.errors().email).toBeUndefined();
  });

  it('should silently ignore honeypot submissions without sending', async () => {
    facade.name.set(CONTACT_FORM_FIXTURES.botName);
    facade.email.set(CONTACT_FORM_FIXTURES.botEmail);
    facade.message.set(CONTACT_FORM_FIXTURES.botMessage);
    facade.honeypot.set(CONTACT_FORM_FIXTURES.honeypotValue);

    const result = await facade.submit();
    expect(result).toBe(true);
    expect(facade.submitStatus()).toBe('success');
  });

  it('should prevent double submissions while submitting', async () => {
    facade.name.set(CONTACT_FORM_FIXTURES.validName);
    facade.email.set(CONTACT_FORM_FIXTURES.doubleSubmitEmail);
    facade.message.set(CONTACT_FORM_FIXTURES.validMessage);

    facade.isSubmitting.set(true);
    const result = await facade.submit();
    expect(result).toBe(false);
  });
});
