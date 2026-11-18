import { Body, Controller, Get, Inject, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { API_CONFIG } from '../config/api-config.module.js';
import { verifyPassword } from './password-hash.js';
import { createSessionToken, isValidSessionToken, SESSION_TTL_MS } from './session-token.js';

export interface AuthConfig {
  readonly adminPasswordHash: string;
  readonly sessionSecret: string;
}

export interface Clock {
  now(): number;
}

export interface LoginBody {
  readonly password?: unknown;
}

export interface HttpResponse {
  setHeader(name: string, value: string): void;
}

export interface HttpRequest {
  readonly headers?: {
    readonly cookie?: string;
  };
}

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    @Inject(API_CONFIG)
    private readonly config: AuthConfig,
    private readonly clock: Clock = { now: () => Date.now() },
  ) {}

  @Post('login')
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) response: HttpResponse,
  ): Promise<{ readonly authenticated: true }> {
    if (
      body === null ||
      typeof body !== 'object' ||
      Array.isArray(body) ||
      !('password' in body)
    ) {
      throw new UnauthorizedException();
    }

    const keys = Object.keys(body);
    if (keys.length !== 1) {
      throw new UnauthorizedException();
    }

    const { password } = body as { password: unknown };
    if (typeof password !== 'string' || password === '') {
      throw new UnauthorizedException();
    }

    const isValid = await verifyPassword(password, this.config.adminPasswordHash);
    if (!isValid) {
      throw new UnauthorizedException();
    }

    const token = createSessionToken(this.config.sessionSecret, this.clock.now());
    const cookie = `ibid_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_MS / 1000}`;
    response.setHeader('Set-Cookie', cookie);

    return { authenticated: true };
  }

  @Get('session')
  session(@Req() request: HttpRequest): { readonly authenticated: boolean } {
    const cookieHeader = request.headers?.cookie ?? '';
    const token = this.extractToken(cookieHeader);
    if (token === undefined) {
      return { authenticated: false };
    }

    const isValid = isValidSessionToken(token, this.config.sessionSecret, this.clock.now());
    return { authenticated: isValid };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: HttpResponse): { readonly authenticated: false } {
    response.setHeader('Set-Cookie', 'ibid_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
    return { authenticated: false };
  }

  private extractToken(cookieHeader: string): string | undefined {
    const cookies = cookieHeader.split(';');
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      if (trimmed.startsWith('ibid_session=')) {
        return trimmed.slice('ibid_session='.length);
      }
    }
    return undefined;
  }
}
