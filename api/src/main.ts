import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { API_CONFIG } from './config/api-config.module.js';
import type { ApiConfig } from './config/api-config.js';
import { SessionGuard } from './auth/session.guard.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ApiConfig>(API_CONFIG);

  app.useGlobalGuards(new SessionGuard({ sessionSecret: config.sessionSecret }));
  await app.listen(config.port, '127.0.0.1');
}

void bootstrap();
