import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { isRecord } from '../common/type-guards.util';

export interface ContactDevResponse {
  readonly success: true;
  readonly message?: string;
}

const CONTACT_CONSTRAINTS = {
  name: { min: 2, max: 100 },
  email: { min: 5, max: 254, localMax: 64 },
  message: { min: 10, max: 2000 },
} as const;

const LOCAL_PART_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_LABEL_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
const TLD_LABEL_PATTERN = /^(?:[a-zA-Z]{2,63}|xn--[a-zA-Z0-9-]{2,59})$/;
const MAX_RAW_INPUT_LENGTH = 50_000;

@Controller('api/v1/contact')
export class ContactDevController {
  @Post()
  @HttpCode(HttpStatus.OK)
  submit(@Body() body: unknown): ContactDevResponse {
    if (process.env['NODE_ENV'] === 'production') {
      throw new NotFoundException();
    }

    if (!isRecord(body)) {
      throw new BadRequestException('Contact payload must be an object');
    }

    const honeypot = body['honeypot'];
    if (honeypot !== undefined && typeof honeypot !== 'string') {
      throw new BadRequestException('Invalid honeypot field');
    }
    if (typeof honeypot === 'string' && honeypot.trim().length > 0) {
      return { success: true };
    }

    validateDevContactFields(body);

    const recaptchaToken = body['recaptchaToken'];
    if (typeof recaptchaToken !== 'string' || recaptchaToken.trim().length === 0) {
      throw new ForbiddenException('Verification token is required');
    }

    return {
      success: true,
      message: 'Message accepted in development mode',
    };
  }
}

function normalizeSingleLine(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ');
}

function normalizeMultiline(raw: string): string {
  return raw.replace(/\r\n?/g, '\n').split('\0').join('').trim();
}

function hasRawHeaderBreak(raw: string): boolean {
  return raw.includes('\r') || raw.includes('\n') || raw.includes('\0');
}

function hasInvalidDotPlacement(value: string): boolean {
  return value.startsWith('.') || value.endsWith('.') || value.includes('..');
}

function isValidEmail(normalizedEmail: string): boolean {
  if (
    normalizedEmail.length < CONTACT_CONSTRAINTS.email.min ||
    normalizedEmail.length > CONTACT_CONSTRAINTS.email.max ||
    /\s/.test(normalizedEmail)
  ) {
    return false;
  }

  const atIndex = normalizedEmail.indexOf('@');
  if (atIndex <= 0 || atIndex !== normalizedEmail.lastIndexOf('@')) {
    return false;
  }

  const localPart = normalizedEmail.slice(0, atIndex);
  const domainPart = normalizedEmail.slice(atIndex + 1);

  if (
    localPart.length < 1 ||
    localPart.length > CONTACT_CONSTRAINTS.email.localMax ||
    hasInvalidDotPlacement(localPart) ||
    !LOCAL_PART_PATTERN.test(localPart)
  ) {
    return false;
  }

  if (domainPart.length < 3 || hasInvalidDotPlacement(domainPart)) {
    return false;
  }

  const labels = domainPart.split('.');
  if (labels.length < 2 || !labels.every((label) => DOMAIN_LABEL_PATTERN.test(label))) {
    return false;
  }

  const tld = labels[labels.length - 1];
  return TLD_LABEL_PATTERN.test(tld);
}

function validateTextField(field: 'name' | 'message', rawValue: unknown): void {
  if (typeof rawValue !== 'string') {
    throw new BadRequestException(`${field} is required`);
  }
  if (rawValue.length > MAX_RAW_INPUT_LENGTH) {
    throw new BadRequestException(`${field} exceeds maximum length`);
  }
  const normalized =
    field === 'message' ? normalizeMultiline(rawValue) : normalizeSingleLine(rawValue);
  if (normalized.length === 0) {
    throw new BadRequestException(`${field} is required`);
  }
  const limits = CONTACT_CONSTRAINTS[field];
  if (normalized.length < limits.min) {
    throw new BadRequestException(`${field} is too short`);
  }
  if (normalized.length > limits.max) {
    throw new BadRequestException(`${field} exceeds maximum length`);
  }
}

function validateEmailField(rawValue: unknown): void {
  if (typeof rawValue !== 'string') {
    throw new BadRequestException('email is required');
  }
  if (rawValue.length > MAX_RAW_INPUT_LENGTH) {
    throw new BadRequestException('email exceeds maximum length');
  }
  if (hasRawHeaderBreak(rawValue)) {
    throw new BadRequestException('Invalid email address');
  }
  const normalized = normalizeSingleLine(rawValue);
  if (normalized.length === 0) {
    throw new BadRequestException('email is required');
  }
  if (normalized.length < CONTACT_CONSTRAINTS.email.min) {
    throw new BadRequestException('email is too short');
  }
  if (normalized.length > CONTACT_CONSTRAINTS.email.max) {
    throw new BadRequestException('email exceeds maximum length');
  }
  if (!isValidEmail(normalized)) {
    throw new BadRequestException('Invalid email address');
  }
}

function validateDevContactFields(body: Record<string, unknown>): void {
  validateTextField('name', body['name']);
  validateEmailField(body['email']);
  validateTextField('message', body['message']);
}
