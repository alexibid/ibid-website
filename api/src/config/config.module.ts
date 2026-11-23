import { Global, Module } from '@nestjs/common';
import { ConfigService, ENV_VARS } from './config.service';

@Global()
@Module({
  providers: [
    {
      provide: ENV_VARS,
      useValue: process.env,
    },
    ConfigService,
  ],
  exports: [ConfigService],
})
export class ConfigModule {}
