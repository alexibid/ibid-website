import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ContactFacade } from './contact.facade';
import { CONTENT_REPOSITORY } from '../../core/services/content-repository.token';
import { SnapshotContentRepository } from '../../core/services/snapshot-content.repository';

describe('ContactFacade', () => {
  let facade: ContactFacade;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        ContactFacade,
        { provide: CONTENT_REPOSITORY, useClass: SnapshotContentRepository }
      ]
    });
    facade = TestBed.inject(ContactFacade);
  });

  it('validates required fields and email format', () => {
    expect(facade.validateForm()).toBe(false);
    expect(facade.errors().name).toBe('Name is required');
    expect(facade.errors().email).toBe('Email is required');
    expect(facade.errors().message).toBe('Message is required');

    facade.name.set('Alex');
    facade.email.set('invalid-email');
    facade.message.set('Hello');
    expect(facade.validateForm()).toBe(false);
    expect(facade.errors().email).toBe('Invalid email address');

    facade.email.set('test@example.com');
    expect(facade.validateForm()).toBe(true);
    expect(facade.errors().name).toBeUndefined();
    expect(facade.errors().email).toBeUndefined();
  });

  it('silently ignores honeypot submissions without sending', async () => {
    facade.name.set('Bot');
    facade.email.set('bot@example.com');
    facade.message.set('Spam');
    facade.honeypot.set('spam-value');

    const result = await facade.submit();
    expect(result).toBe(true);
    expect(facade.submitStatus()).toBe('success');
  });

  it('prevents double submissions while submitting', async () => {
    facade.name.set('Alex');
    facade.email.set('alex@example.com');
    facade.message.set('Hello');

    facade.isSubmitting.set(true);
    const result = await facade.submit();
    expect(result).toBe(false);
  });
});
