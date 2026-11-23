import { Module } from '@nestjs/common';
import { StaticExportModule } from '../static-export/static-export.module';
import { MediaController } from './media.controller';
import { MediaStorageService } from './media-storage.service';
import { MediaService } from './media.service';

@Module({
  imports: [StaticExportModule],
  controllers: [MediaController],
  providers: [MediaStorageService, MediaService],
  exports: [MediaService],
})
export class MediaModule {}
