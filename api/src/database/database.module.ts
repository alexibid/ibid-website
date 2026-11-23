import { Global, Module } from '@nestjs/common';
import {
  DRIZZLE_DB,
  DatabaseShutdownHook,
  PG_POOL,
  databaseProviders,
} from './database.provider';

@Global()
@Module({
  providers: [...databaseProviders, DatabaseShutdownHook],
  exports: [PG_POOL, DRIZZLE_DB],
})
export class DatabaseModule {}
