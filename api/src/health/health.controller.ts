import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { DATABASE_CONNECTION, type DatabaseConnection } from '../database/database.module.js';

@Controller('api/v1/health')
export class HealthController {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly database: DatabaseConnection,
  ) {}

  @Get()
  async get(): Promise<{ readonly status: 'ok' }> {
    try {
      await this.database.check();
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}
