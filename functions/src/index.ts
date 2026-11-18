export interface ContactPayload {
  name: string;
  email: string;
  message: string;
  honeypot?: string;
  recaptchaToken?: string;
}

export interface VerificationResult {
  success: boolean;
  score?: number;
  error?: string;
}

export async function verifyRecaptcha(token?: string, secretKey = process.env['RECAPTCHA_SECRET_KEY']): Promise<VerificationResult> {
  if (!token) {
    return { success: false, error: 'reCAPTCHA token is missing' };
  }
  if (!secretKey) {
    return { success: true };
  }

  try {
    const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`
    });
    const data = await res.json() as { success: boolean; score?: number };
    return { success: data.success === true, score: data.score };
  } catch {
    return { success: false, error: 'Failed to verify reCAPTCHA' };
  }
}

export async function handleContactSubmission(payload: ContactPayload): Promise<{ status: number; body: Record<string, unknown> }> {
  if (payload.honeypot && payload.honeypot.trim().length > 0) {
    return { status: 200, body: { success: true } };
  }

  if (!payload.name?.trim() || !payload.email?.trim() || !payload.message?.trim()) {
    return { status: 400, body: { error: 'Missing required fields' } };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email.trim())) {
    return { status: 400, body: { error: 'Invalid email address' } };
  }

  const verification = await verifyRecaptcha(payload.recaptchaToken);
  if (!verification.success) {
    return { status: 403, body: { error: 'reCAPTCHA verification failed' } };
  }

  return { status: 200, body: { success: true, message: 'Message sent successfully' } };
}
