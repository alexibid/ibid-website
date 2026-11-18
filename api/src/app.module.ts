import { Module } from '@nestjs/common';
import { ApiConfigModule } from './config/api-config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ContentModule } from './content/content.module.js';
import { SnapshotModule } from './snapshot/snapshot.module.js';

@Module({
  imports: [
    ApiConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    ContentModule,
    SnapshotModule,
  ],
})
export class AppModule {}
