import { Global, Module } from '@nestjs/common';

export const DATABASE_CONNECTION = Symbol('DATABASE_CONNECTION');

export interface DatabaseConnection {
  check(): Promise<void>;
}

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useValue: {
        check: async (): Promise<void> => Promise.resolve(),
      },
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
