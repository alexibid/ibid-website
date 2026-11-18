import { Global, Module } from '@nestjs/common';
import { type ApiConfig, readApiConfig } from './api-config.js';

export const API_CONFIG = Symbol('API_CONFIG');

@Global()
@Module({
  providers: [
    {
      provide: API_CONFIG,
      useFactory: (): ApiConfig => readApiConfig(process.env),
    },
  ],
  exports: [API_CONFIG],
})
export class ApiConfigModule {}
