import { Injectable } from '@nestjs/common';

export interface ApiStatusInfo {
  readonly service: string;
  readonly status: string;
  readonly timestamp: string;
}

@Injectable()
export class AppService {
  getInfo(): ApiStatusInfo {
    return {
      service: 'ibid-website-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
