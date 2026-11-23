import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  type MediaRecord,
  MediaService,
  type UploadedMediaFile,
} from './media.service';

@Controller(['api/v1/media', 'api/media'])
export class MediaController {
  constructor(@Inject(MediaService) private readonly mediaService: MediaService) {}

  @Get()
  findAll(): Promise<MediaRecord[]> {
    return this.mediaService.findAll();
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  upload(@UploadedFile() file: UploadedMediaFile | undefined): Promise<MediaRecord> {
    return this.mediaService.upload(file);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.mediaService.remove(id);
  }
}
