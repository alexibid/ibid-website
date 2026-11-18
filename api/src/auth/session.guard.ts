import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { isValidSessionToken } from './session-token.js';

export interface SessionGuardConfig {
  readonly sessionSecret: string;
}

export interface Clock {
  now(): number;
}

export interface GuardRequest {
  readonly method: string;
  readonly url: string;
  readonly headers?: {
    readonly cookie?: string;
  };
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly config: SessionGuardConfig,
    private readonly clock: Clock = { now: () => Date.now() },
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<GuardRequest>();
    return this.isAllowed(request);
  }

  isAllowed(request: GuardRequest): boolean {
    const method = request.method.toUpperCase();
    if (method === 'GET' || method === 'HEAD') {
      return true;
    }

    const path = request.url.split('?')[0] ?? '';
    if (path === '/api/v1/auth/login') {
      return true;
    }

    const cookieHeader = request.headers?.cookie ?? '';
    const token = this.extractSessionCookie(cookieHeader);
    if (token === undefined) {
      throw new UnauthorizedException();
    }

    const isValid = isValidSessionToken(token, this.config.sessionSecret, this.clock.now());
    if (!isValid) {
      throw new UnauthorizedException();
    }

    return true;
  }

  private extractSessionCookie(cookieHeader: string): string | undefined {
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
