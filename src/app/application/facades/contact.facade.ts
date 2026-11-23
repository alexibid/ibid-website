import { Injectable, PendingTasks, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CONTENT_READ_REPOSITORY } from '../../infrastructure/tokens/content-repository.token';
import { BookService } from '../../infrastructure/services/book.service';
import { StateService } from '../state/state.service';
import { PageType } from '../../domain/models/page-type.enum';
import { CmsPage } from '../../domain/models/cms.interface';

export interface ContactFormErrors {
  name?: string;
  email?: string;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ContactFacade {
  private readonly repo = inject(CONTENT_READ_REPOSITORY);
  private readonly bookService = inject(BookService);
  private readonly pendingTasks = inject(PendingTasks);
  public readonly stateService = inject(StateService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  public readonly sections = signal<readonly CmsPage[]>([]);
  public readonly isLoading = signal<boolean>(false);

  public readonly name = signal<string>('');
  public readonly email = signal<string>('');
  public readonly message = signal<string>('');
  public readonly honeypot = signal<string>('');

  public readonly errors = signal<ContactFormErrors>({});
  public readonly isSubmitting = signal<boolean>(false);
  public readonly submitStatus = signal<'idle' | 'success' | 'error'>('idle');
  public readonly errorMessage = signal<string>('');

  private recaptchaLoaded = false;

  public loadRecaptchaScript(): void {
    if (!this.isBrowser || this.recaptchaLoaded) return;
    this.recaptchaLoaded = true;
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }

  public validateForm(): boolean {
    const errs: ContactFormErrors = {};
    const n = this.name().trim();
    const e = this.email().trim();
    const m = this.message().trim();

    if (!n) {
      errs.name = 'Name is required';
    }
    if (!e) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      errs.email = 'Invalid email address';
    }
    if (!m) {
      errs.message = 'Message is required';
    }

    this.errors.set(errs);
    return Object.keys(errs).length === 0;
  }

  public async submit(): Promise<boolean> {
    if (this.isSubmitting()) {
      return false;
    }

    if (!this.validateForm()) {
      return false;
    }

    if (this.honeypot().trim()) {
      this.submitStatus.set('success');
      return true;
    }

    if (this.isBrowser && !navigator.onLine) {
      this.submitStatus.set('error');
      this.errorMessage.set('Could not send message. Please check your internet connection.');
      return false;
    }

    this.isSubmitting.set(true);
    this.submitStatus.set('idle');

    try {
      const response = await fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.name().trim(),
          email: this.email().trim(),
          message: this.message().trim(),
          honeypot: this.honeypot().trim()
        })
      });

      if (!response.ok) {
        throw new Error('Server returned an error');
      }

      this.submitStatus.set('success');
      this.name.set('');
      this.email.set('');
      this.message.set('');
      this.errors.set({});
      return true;
    } catch {
      this.submitStatus.set('error');
      this.errorMessage.set('Could not send message. Please check your internet connection.');
      return false;
    } finally {
      this.isSubmitting.set(false);
    }
  }

  public async loadExitSections(lang: string): Promise<void> {
    const done = this.pendingTasks.add();
    this.isLoading.set(true);
    try {
      const records = await this.repo.loadSections(PageType.Exit, lang);
      const structuralOrder = ['contact-form', 'about', 'back-cover'];
      const sorted = [...records].sort((a, b) => {
        const locA = a.metadata?.location;
        const locB = b.metadata?.location;
        const orderA = locA && structuralOrder.indexOf(locA) !== -1 ? structuralOrder.indexOf(locA) : 99;
        const orderB = locB && structuralOrder.indexOf(locB) !== -1 ? structuralOrder.indexOf(locB) : 99;
        return orderA - orderB;
      });
      this.sections.set(sorted);
    } finally {
      this.isLoading.set(false);
      done();
    }
  }

  public setPageCount(slug: string, count: number): void {
    this.bookService.setPageCount(slug, count);
  }
}
