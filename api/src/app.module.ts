import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { MediaModule } from './media/media.module';
import { PagesModule } from './pages/pages.module';
import { StaticExportModule } from './static-export/static-export.module';
import { FileSystemModule } from './storage/file-system.module';
import { UrlsModule } from './urls/urls.module';

@Module({
  imports: [
    ConfigModule,
    FileSystemModule,
    DatabaseModule,
    StaticExportModule,
    PagesModule,
    UrlsModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
