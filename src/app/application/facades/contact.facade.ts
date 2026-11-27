import { HttpClient, HttpContext } from '@angular/common/http';
import { DestroyRef, Injectable, PendingTasks, computed, inject } from '@angular/core';
import { Subscription, timeout } from 'rxjs';
import { CONTENT_READ_REPOSITORY } from '../../infrastructure/tokens/content-repository.token';
import { ANTI_SPAM_TOKEN_PORT, CONTACT_ENDPOINT } from '../../infrastructure/tokens/contact.tokens';
import { BYPASS_GLOBAL_ERROR } from '../../infrastructure/interceptors/error.interceptor';
import { BookService } from '../../infrastructure/services/book.service';
import { classifyContactHttpError } from '../../infrastructure/services/contact-http-error.mapper';
import { I18nService } from '../../infrastructure/services/i18n.service';
import { RoutingService } from '../../infrastructure/services/routing.service';
import { ContactStore } from '../state/contact.store';
import { type ChapterEstimator, StateService } from '../state/state.service';
import { PageType } from '../../domain/models/page-type.enum';
import type {
  ContactApiResponse, ContactFieldErrorCode, ContactFieldName,
  ContactSubmissionErrorCode, ContactSubmissionPayload
} from '../../domain/models/contact.model';
import { CONTACT_FIELD_ERROR_KEYS } from '../../domain/constants/contact-i18n';
import {
  CONTACT_FIELD_ORDER,
  normalizeMultiline,
  normalizeSingleLine
} from '../../domain/validators/contact-form.validator';

const CONTACT_SUBMIT_TIMEOUT_MS = 15_000;

export interface ContactFormErrors {
  readonly name?: string;
  readonly email?: string;
  readonly message?: string;
}

interface ActiveContactSubmission {
  readonly subscription: Subscription;
  readonly resolve: (result: boolean) => void;
}

@Injectable({
  providedIn: 'root'
})
export class ContactFacade {
  private readonly store = inject(ContactStore);
  private readonly repo = inject(CONTENT_READ_REPOSITORY);
  private readonly http = inject(HttpClient);
  private readonly endpoint = inject(CONTACT_ENDPOINT);
  private readonly antiSpam = inject(ANTI_SPAM_TOKEN_PORT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly bookService = inject(BookService);
  private readonly i18n = inject(I18nService);
  private readonly routingService = inject(RoutingService);
  private readonly stateService = inject(StateService);
  private readonly pendingTasks = inject(PendingTasks);

  public readonly isBrowser = this.stateService.isBrowser;
  public readonly sections = computed(() => this.store.sections());
  public readonly isLoading = computed(() => this.store.isLoading());
  public readonly name = this.store.values.name;
  public readonly email = this.store.values.email;
  public readonly message = this.store.values.message;
  public readonly honeypot = this.store.values.honeypot;
  public readonly touched = this.store.touched;
  public readonly submittedAttempted = this.store.submittedAttempted;
  public readonly isSubmitting = computed(() => this.store.isSubmitting());
  public readonly submitStatus = computed(() => this.store.submitStatus());
  public readonly errorMessage = computed(() => this.store.errorMessage());
  public readonly submissionErrorCode = this.store.submissionErrorCode;
  public readonly validationResult = this.store.validationResult;
  public readonly rawErrors = this.store.rawErrors;
  public readonly visibleErrors = this.store.visibleErrors;
  public readonly isValid = this.store.isValid;
  public readonly firstInvalidField = this.store.firstInvalidField;
  public readonly currentLang = this.i18n.currentLangCode.asReadonly();
  public readonly isDesktop = this.stateService.isDesktop.asReadonly();
  public readonly dynamicRouteOrder = this.bookService.dynamicRouteOrder.asReadonly();

  public readonly errors = computed<ContactFormErrors>(() => {
    const visible = this.visibleErrors();
    const mapped: Partial<Record<ContactFieldName, string>> = {};

    for (const field of CONTACT_FIELD_ORDER) {
      const code = visible[field];
      if (code !== undefined) {
        const fieldKeys: Readonly<Partial<Record<ContactFieldErrorCode, string>>> =
          CONTACT_FIELD_ERROR_KEYS[field];
        const key = fieldKeys[code];
        if (key !== undefined) {
          mapped[field] = key;
        }
      }
    }

    return mapped;
  });

  private activeSubmission: ActiveContactSubmission | undefined;

  constructor() {
    this.destroyRef.onDestroy(() => this.cancelPendingSubmission());
  }

  public initAntiSpam(): void {
    this.antiSpam.init();
  }

  public updateField(field: ContactFieldName, value: string): void {
    this.store.updateField(field, value);
  }

  public updateHoneypot(value: string): void {
    this.store.updateHoneypot(value);
  }

  public blurField(field: ContactFieldName): void {
    this.store.blurField(field);
  }

  public validateForm(): boolean {
    return this.store.validateForm();
  }

  public submit(): Promise<boolean> {
    if (this.store.isSubmitting() || this.activeSubmission !== undefined) {
      return Promise.resolve(false);
    }

    this.store.prepareSubmit();

    if (!this.store.validateForm()) {
      return Promise.resolve(false);
    }

    if (this.store.values.honeypot().trim()) {
      this.store.markSucceeded();
      return Promise.resolve(true);
    }

    if (this.isBrowser && !this.isOnline()) {
      this.store.markFailed('offline');
      return Promise.resolve(false);
    }

    this.store.startSubmitting();
    return this.executeSubmission();
  }

  public cancelPendingSubmission(): void {
    const pending = this.activeSubmission;
    if (pending === undefined) {
      return;
    }
    this.activeSubmission = undefined;
    pending.subscription.unsubscribe();
    this.store.cancelSubmitting();
    pending.resolve(false);
  }

  public resetSubmission(): void {
    this.store.resetSubmission();
  }

  public resetForm(): void {
    this.cancelPendingSubmission();
    this.store.resetForm();
  }

  public async loadExitSections(lang: string): Promise<void> {
    const done = this.pendingTasks.add();
    this.store.setLoading(true);
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
      this.store.setSections(sorted);
    } finally {
      this.store.setLoading(false);
      done();
    }
  }

  public setLanguage(lang: string): void {
    this.i18n.setLanguage(lang);
  }

  public setPageCount(slug: string, count: number): void {
    this.bookService.setPageCount(slug, count);
  }

  public syncBookPagination(host: HTMLElement, estimate: ChapterEstimator): Promise<void> {
    return this.stateService.syncAllChapterPageCounts(
      host,
      {
        bookService: this.bookService,
        routingService: this.routingService,
        contentRepo: this.repo,
        isDesktop: this.isDesktop()
      },
      estimate
    );
  }

  private isOnline(): boolean {
    return !this.isBrowser || typeof navigator === 'undefined' || navigator.onLine !== false;
  }

  private buildSubmissionPayload(recaptchaToken: string): ContactSubmissionPayload {
    return {
      name: normalizeSingleLine(this.store.values.name()),
      email: normalizeSingleLine(this.store.values.email()),
      message: normalizeMultiline(this.store.values.message()),
      honeypot: this.store.values.honeypot().trim(),
      recaptchaToken
    };
  }

  private clearActiveSubmission(submission: ActiveContactSubmission): boolean {
    if (this.activeSubmission !== submission) {
      return false;
    }
    this.activeSubmission = undefined;
    return true;
  }

  private failSubmission(submission: ActiveContactSubmission, code: ContactSubmissionErrorCode): void {
    if (!this.clearActiveSubmission(submission)) return;
    this.store.markFailed(code);
    submission.resolve(false);
  }

  private executeSubmission(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const submission: ActiveContactSubmission = { subscription: new Subscription(), resolve };
      this.activeSubmission = submission;
      void this.acquireVerificationToken(submission).then(
        (token) => {
          if (this.activeSubmission === submission) {
            this.sendSubmission(submission, this.buildSubmissionPayload(token));
          }
        },
        () => this.failSubmission(submission, 'verification')
      );
    });
  }

  private async acquireVerificationToken(submission: ActiveContactSubmission): Promise<string> {
    let release: (() => void) | undefined = this.pendingTasks.add();
    const finish = (): void => {
      release?.();
      release = undefined;
    };
    submission.subscription.add(finish);
    try {
      const token = await this.antiSpam.execute('contact_submit');
      if (typeof token !== 'string' || !token.trim()) {
        throw new Error('Anti-spam verification returned an empty token.');
      }
      return token;
    } finally {
      finish();
    }
  }

  private sendSubmission(submission: ActiveContactSubmission, payload: ContactSubmissionPayload): void {
    const requestSubscription = this.http
      .post<ContactApiResponse>(this.endpoint, payload, {
        context: new HttpContext().set(BYPASS_GLOBAL_ERROR, true)
      })
      .pipe(timeout(CONTACT_SUBMIT_TIMEOUT_MS))
      .subscribe({
        next: () => {
          if (this.clearActiveSubmission(submission)) {
            this.store.markSucceeded();
            submission.resolve(true);
          }
        },
        error: (error: unknown) =>
          this.failSubmission(submission, classifyContactHttpError(error, this.isOnline())),
        complete: () => {
          if (this.clearActiveSubmission(submission)) {
            this.store.cancelSubmitting();
            submission.resolve(false);
          }
        }
      });

    if (this.activeSubmission === submission) submission.subscription.add(requestSubscription);
    else requestSubscription.unsubscribe();
  }
}
