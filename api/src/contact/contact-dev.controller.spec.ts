import 'reflect-metadata';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { afterEach, beforeEach } from 'vitest';
import { CONTACT_DEV_FIXTURES } from '../mocks/contact-dev-fixtures.mock';
import { ContactDevController } from './contact-dev.controller';

describe('ContactDevController', () => {
  let savedNodeEnv: string | undefined;

  beforeEach(() => {
    savedNodeEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'development';
  });

  afterEach(() => {
    if (savedNodeEnv === undefined) {
      delete process.env['NODE_ENV'];
    } else {
      process.env['NODE_ENV'] = savedNodeEnv;
    }
  });

  it('should accept a valid dev contact submission when not in production', () => {
    const controller = new ContactDevController();

    const result = controller.submit(CONTACT_DEV_FIXTURES.validSubmission);

    expect(result).toEqual({
      success: true,
      message: 'Message accepted in development mode',
    });
  });

  it('should return 200 silently for a non-empty honeypot without requiring fields or token', () => {
    const controller = new ContactDevController();

    const result = controller.submit(CONTACT_DEV_FIXTURES.honeypotSubmission);

    expect(result).toEqual({ success: true });
  });

  it('should reject invalid payloads with BadRequestException for missing fields, header breaks in email, or excessive length', () => {
    const controller = new ContactDevController();

    expect(() => controller.submit(CONTACT_DEV_FIXTURES.invalidPayloads.missingName)).toThrow(
      BadRequestException,
    );
    expect(() =>
      controller.submit(CONTACT_DEV_FIXTURES.invalidPayloads.headerBreakEmail),
    ).toThrow(BadRequestException);
    expect(() =>
      controller.submit(CONTACT_DEV_FIXTURES.invalidPayloads.tooLongMessage),
    ).toThrow(BadRequestException);
  });

  it('should reject requests missing a verification token with ForbiddenException', () => {
    const controller = new ContactDevController();

    expect(() => controller.submit(CONTACT_DEV_FIXTURES.missingTokenSubmission)).toThrow(
      ForbiddenException,
    );
  });

  it('should throw NotFoundException when NODE_ENV is production', () => {
    process.env['NODE_ENV'] = 'production';
    const controller = new ContactDevController();

    expect(() => controller.submit(CONTACT_DEV_FIXTURES.validSubmission)).toThrow(
      NotFoundException,
    );
  });
});
