export interface VerifyRecaptchaOptions {
  readonly secretKey?: string;
  readonly minScore?: number;
  readonly isEmulator?: boolean;
  readonly fetchImpl?: typeof fetch;
}

export type RecaptchaVerificationResult =
  | { readonly success: true; readonly score?: number }
  | { readonly success: false; readonly status: 403 | 500; readonly error: string };

const RECAPTCHA_SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const RECAPTCHA_TIMEOUT_MS = 5000;
const DEFAULT_MIN_SCORE = 0.5;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseRecaptchaResponse(data: unknown, minScore: number): RecaptchaVerificationResult {
  if (!isRecord(data)) {
    return { success: false, status: 403, error: 'Invalid reCAPTCHA verification response' };
  }

  if (data['success'] !== true) {
    return { success: false, status: 403, error: 'reCAPTCHA verification failed' };
  }

  const score = data['score'];
  if (score !== undefined) {
    if (typeof score !== 'number' || !Number.isFinite(score) || score < minScore) {
      return { success: false, status: 403, error: 'reCAPTCHA score below threshold' };
    }
    return { success: true, score };
  }

  return { success: true };
}

export async function verifyRecaptcha(
  token: unknown,
  options: VerifyRecaptchaOptions = {},
): Promise<RecaptchaVerificationResult> {
  if (typeof token !== 'string' || token.trim().length === 0) {
    return { success: false, status: 403, error: 'reCAPTCHA token is missing' };
  }

  const secretKey = (options.secretKey ?? process.env['RECAPTCHA_SECRET_KEY'] ?? '').trim();
  const isEmulator = options.isEmulator ?? process.env['FUNCTIONS_EMULATOR'] === 'true';

  if (!secretKey) {
    if (isEmulator) {
      return { success: true };
    }
    return { success: false, status: 500, error: 'reCAPTCHA secret key is not configured' };
  }

  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(RECAPTCHA_SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey,
        response: token.trim(),
      }).toString(),
      signal: AbortSignal.timeout(RECAPTCHA_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { success: false, status: 403, error: 'reCAPTCHA verification failed' };
    }

    const data: unknown = await response.json();
    return parseRecaptchaResponse(data, minScore);
  } catch {
    return { success: false, status: 403, error: 'Failed to verify reCAPTCHA' };
  }
}
