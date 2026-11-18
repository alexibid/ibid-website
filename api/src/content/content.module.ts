import { Module } from '@nestjs/common';
import { PagesController } from './pages.controller.js';
import { DrizzlePagesRepository, PAGES_REPOSITORY } from './pages.repository.js';
import { SnapshotModule } from '../snapshot/snapshot.module.js';

@Module({
  imports: [SnapshotModule],
  controllers: [PagesController],
  providers: [
    {
      provide: PAGES_REPOSITORY,
      useClass: DrizzlePagesRepository,
    },
  ],
  exports: [PAGES_REPOSITORY],
})
export class ContentModule {}
