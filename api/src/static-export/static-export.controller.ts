import { Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { StaticExportService } from './static-export.service';
import type { StaticExportResult } from './static-export.types';

@Controller('api/v1/export')
export class StaticExportController {
  constructor(
    @Inject(StaticExportService)
    private readonly staticExportService: StaticExportService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  exportAll(): Promise<StaticExportResult> {
    return this.staticExportService.exportAll();
  }
}
