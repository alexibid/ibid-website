import {
  Controller,
  Get,
  Inject,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppService, type ApiStatusInfo } from './app.service';
import { type DatabasePool, PG_POOL } from './database/database.provider';

export interface HealthStatus {
  readonly status: 'ok';
  readonly database: 'up';
  readonly timestamp: string;
}

@Controller()
export class AppController {
  constructor(
    @Inject(PG_POOL) private readonly pool: DatabasePool,
    @Optional() @Inject(AppService) private readonly appService?: AppService,
  ) {}

  @Get()
  getRoot(): ApiStatusInfo {
    if (this.appService) {
      return this.appService.getInfo();
    }
    return {
      service: 'ibid-website-api',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get(['api/v1/health', 'api/health', 'health'])
  async getHealth(): Promise<HealthStatus> {
    try {
      await this.pool.query('SELECT 1');
      return {
        status: 'ok',
        database: 'up',
        timestamp: new Date().toISOString(),
      };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}
