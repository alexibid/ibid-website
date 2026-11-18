import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function createSessionToken(secret: string, now: number): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(String(now));
  const signature = hmac.digest('hex');
  return `${now}.${signature}`;
}

export function isValidSessionToken(token: string, secret: string, now: number): boolean {
  if (typeof token !== 'string' || token === '') {
    return false;
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return false;
  }

  const rawTimestamp = parts[0];
  const signature = parts[1];
  if (rawTimestamp === undefined || signature === undefined || rawTimestamp === '' || signature === '') {
    return false;
  }

  if (!/^\d+$/.test(rawTimestamp)) {
    return false;
  }

  const issuedAt = Number(rawTimestamp);
  if (!Number.isSafeInteger(issuedAt) || now < issuedAt || now > issuedAt + SESSION_TTL_MS) {
    return false;
  }

  const hmac = createHmac('sha256', secret);
  hmac.update(rawTimestamp);
  const expectedSignature = hmac.digest('hex');

  const signatureBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer);
}
