import { defineSecret } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import {
  type ComposedContactEmail,
  composeContactEmail,
  validateContactFields,
} from './contact-validation.js';
import { createNodemailerMailer } from './mailer.js';
import {
  createSlidingWindowRateLimiter,
  type SlidingWindowRateLimiter,
} from './rate-limiter.js';
import {
  type RecaptchaVerificationResult,
  verifyRecaptcha,
} from './recaptcha.js';

export interface ContactPayload {
  readonly name: string;
  readonly email: string;
  readonly message: string;
  readonly honeypot?: string;
  readonly recaptchaToken?: string;
}

export interface ContactSubmissionDependencies {
  readonly clientIp?: string;
  readonly rateLimiter?: SlidingWindowRateLimiter;
  readonly verifyRecaptchaToken?: (token: unknown) => Promise<RecaptchaVerificationResult>;
  readonly sendMail?: (email: ComposedContactEmail) => Promise<void>;
  readonly mailbox?: string;
  readonly smtpPassword?: string;
  readonly recaptchaSecretKey?: string;
  readonly isEmulator?: boolean;
}

export interface ContactSubmissionHttpResult {
  readonly status: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body: Record<string, unknown>;
}

export interface ClientIpRequest {
  readonly ip?: string;
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
}

interface ResponseHeaderSetter {
  setHeader(name: string, value: string): unknown;
}

const contactMailboxSecret = defineSecret('CONTACT_MAILBOX');
const contactSmtpPasswordSecret = defineSecret('CONTACT_SMTP_PASSWORD');
const recaptchaSecretKeySecret = defineSecret('RECAPTCHA_SECRET_KEY');

const defaultRateLimiter = createSlidingWindowRateLimiter({
  maxRequests: 5,
  windowMs: 60_000,
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function firstForwardedIp(headerValue: string | readonly string[] | undefined): string {
  if (typeof headerValue === 'string') {
    return headerValue.split(',')[0]?.trim() ?? '';
  }
  if (Array.isArray(headerValue)) {
    for (const item of headerValue) {
      if (typeof item === 'string') {
        const candidate = item.split(',')[0]?.trim() ?? '';
        if (candidate) {
          return candidate;
        }
      }
    }
  }
  return '';
}

export function extractClientIp(req: ClientIpRequest): string {
  const forwarded = firstForwardedIp(req.headers['x-forwarded-for']);
  if (forwarded) {
    return forwarded;
  }
  const directIp = typeof req.ip === 'string' ? req.ip.trim() : '';
  return directIp || 'unknown';
}

function applyResponseHeaders(
  res: ResponseHeaderSetter,
  headers?: Readonly<Record<string, string>>,
): void {
  if (!headers) {
    return;
  }
  for (const [name, value] of Object.entries(headers)) {
    res.setHeader(name, value);
  }
}

async function deliverContactEmail(
  email: ComposedContactEmail,
  deps: ContactSubmissionDependencies,
): Promise<void> {
  if (deps.sendMail) {
    await deps.sendMail(email);
    return;
  }
  const mailbox = (deps.mailbox ?? process.env['CONTACT_MAILBOX'] ?? '').trim();
  const smtpPassword = (deps.smtpPassword ?? process.env['CONTACT_SMTP_PASSWORD'] ?? '').trim();
  const mailer = createNodemailerMailer({ mailbox, smtpPassword });
  await mailer.send(email);
}

export async function handleContactSubmission(
  payload: unknown,
  deps: ContactSubmissionDependencies = {},
): Promise<ContactSubmissionHttpResult> {
  if (!isPlainObject(payload)) {
    return { status: 400, body: { error: 'Request body must be a JSON object' } };
  }

  const honeypot = payload['honeypot'];
  if (honeypot !== undefined && typeof honeypot !== 'string') {
    return { status: 400, body: { error: 'Invalid honeypot field' } };
  }
  if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
    return { status: 200, body: { success: true } };
  }

  const validation = validateContactFields(payload);
  if (!validation.valid) {
    return {
      status: 400,
      body: { error: validation.error, fieldErrors: validation.fieldErrors },
    };
  }

  const rateLimiter = deps.rateLimiter ?? defaultRateLimiter;
  const clientIp = deps.clientIp?.trim() || 'unknown';
  const rateLimit = rateLimiter.consume(clientIp);
  if (!rateLimit.allowed) {
    return {
      status: 429,
      headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
      body: { error: 'Too many requests' },
    };
  }

  const verify =
    deps.verifyRecaptchaToken ??
    ((token: unknown) =>
      verifyRecaptcha(token, {
        secretKey: deps.recaptchaSecretKey,
        isEmulator: deps.isEmulator,
      }));
  const verification = await verify(payload['recaptchaToken']);
  if (!verification.success) {
    return { status: verification.status, body: { error: verification.error } };
  }

  const mailbox = (deps.mailbox ?? process.env['CONTACT_MAILBOX'] ?? '').trim();
  const smtpPassword = (deps.smtpPassword ?? process.env['CONTACT_SMTP_PASSWORD'] ?? '').trim();
  if (!mailbox || (!deps.sendMail && !smtpPassword)) {
    return { status: 500, body: { error: 'Contact delivery is not configured' } };
  }

  const email = composeContactEmail(validation.fields, mailbox);
  try {
    await deliverContactEmail(email, deps);
  } catch {
    return { status: 500, body: { error: 'Failed to send message' } };
  }

  return { status: 200, body: { success: true, message: 'Message sent successfully' } };
}

export const sendContactMessage = onRequest(
  {
    region: 'europe-west1',
    maxInstances: 3,
    secrets: [contactMailboxSecret, contactSmtpPasswordSecret, recaptchaSecretKeySecret],
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const payload: unknown = req.body;
    const result = await handleContactSubmission(payload, {
      clientIp: extractClientIp(req),
      mailbox: contactMailboxSecret.value(),
      smtpPassword: contactSmtpPasswordSecret.value(),
      recaptchaSecretKey: recaptchaSecretKeySecret.value(),
    });

    applyResponseHeaders(res, result.headers);
    res.status(result.status).json(result.body);
  },
);
