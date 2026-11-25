import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';
import { loadApiEnv } from './config/env-loader';
import { noStoreCacheMiddleware } from './common/no-store-cache.middleware';

async function bootstrap(): Promise<void> {
  loadApiEnv();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  app.enableCors({
    origin: [...config.corsOrigins],
    credentials: true,
  });
  app.useStaticAssets(config.mediaDir, {
    prefix: '/images/',
  });

  app.use('/api', noStoreCacheMiddleware);

  await app.listen(config.serverPort, config.serverHost);
  process.stdout.write(
    `ibid-website-api listening on http://${config.serverHost}:${config.serverPort}\n`,
  );
}

void bootstrap();
