import { Global, Module } from '@nestjs/common';
import { FILE_SYSTEM, FileSystemService } from './file-system.service';

@Global()
@Module({
  providers: [
    FileSystemService,
    {
      provide: FILE_SYSTEM,
      useExisting: FileSystemService,
    },
  ],
  exports: [FILE_SYSTEM, FileSystemService],
})
export class FileSystemModule {}
