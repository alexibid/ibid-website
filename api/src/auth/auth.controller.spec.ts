import { UnauthorizedException } from '@nestjs/common';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import { hashPassword } from './password-hash.js';
import { createSessionToken } from './session-token.js';
import { MOCK_LOGIN_BODIES, MOCK_NOW, MOCK_PASSWORDS, MOCK_SESSION_SECRET } from './auth.mock.js';

let controller: AuthController;

beforeAll(async () => {
  const adminPasswordHash = await hashPassword(MOCK_PASSWORDS.right);
  controller = new AuthController({ adminPasswordHash, sessionSecret: MOCK_SESSION_SECRET }, { now: () => MOCK_NOW });
});

function mockResponse() {
  return { setHeader: vi.fn<(name: string, value: string) => void>() };
}

async function refusalOf(body: unknown): Promise<unknown> {
  const response = mockResponse();
  const error = await controller.login(body, response).then(
    () => undefined,
    (thrown: unknown) => thrown,
  );
  expect(error).toBeInstanceOf(UnauthorizedException);
  expect(response.setHeader).not.toHaveBeenCalled();
  return error instanceof UnauthorizedException ? error.getResponse() : error;
}

describe('AuthController', () => {
  it('should log in with the right password and set an httpOnly strict session cookie', async () => {
    const response = mockResponse();

    await controller.login({ password: MOCK_PASSWORDS.right }, response);

    const [name, cookie] = response.setHeader.mock.calls[0] ?? [];
    expect(name).toBe('Set-Cookie');
    expect(cookie).toContain('ibid_session=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Strict');
    expect(cookie).not.toContain(MOCK_PASSWORDS.right);
  });

  it('should prove a wrong password is rejected without explaining why', async () => {
    const wrong = await refusalOf({ password: MOCK_PASSWORDS.wrong });
    const missing = await refusalOf(MOCK_LOGIN_BODIES.missing);

    expect(wrong).toEqual(missing);
    expect(JSON.stringify(wrong)).not.toMatch(/password|wrong|invalid|incorrect/i);
  });

  it.each([
    MOCK_LOGIN_BODIES.missing,
    MOCK_LOGIN_BODIES.notAnObject,
    MOCK_LOGIN_BODIES.wrongType,
    MOCK_LOGIN_BODIES.extraField,
    { password: MOCK_PASSWORDS.empty },
  ])('should refuse the login body %j the same way as a wrong password', async (body) => {
    const refusal = await refusalOf(body);
    const wrong = await refusalOf({ password: MOCK_PASSWORDS.wrong });

    expect(refusal).toEqual(wrong);
  });

  it('should report a valid session as authenticated', () => {
    const cookie = `ibid_session=${createSessionToken(MOCK_SESSION_SECRET, MOCK_NOW)}`;

    expect(controller.session({ headers: { cookie } })).toEqual({ authenticated: true });
  });

  it('should report no session or a forged one as not authenticated', () => {
    const forged = `ibid_session=${createSessionToken('other', MOCK_NOW)}`;

    expect(controller.session({ headers: {} })).toEqual({ authenticated: false });
    expect(controller.session({ headers: { cookie: forged } })).toEqual({ authenticated: false });
  });

  it('should clear the session cookie on logout', () => {
    const response = mockResponse();

    controller.logout(response);

    const [, cookie] = response.setHeader.mock.calls[0] ?? [];
    expect(cookie).toContain('ibid_session=;');
    expect(cookie).toContain('Max-Age=0');
  });
});
