import { Module } from '@nestjs/common';
import { StaticExportModule } from '../static-export/static-export.module';
import { PagesController } from './pages.controller';
import { PagesService } from './pages.service';

@Module({
  imports: [StaticExportModule],
  controllers: [PagesController],
  providers: [PagesService],
  exports: [PagesService],
})
export class PagesModule {}
