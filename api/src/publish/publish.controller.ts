import { Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { PublishService } from './publish.service';
import type { PublishResult } from './publish.service';

@Controller('api/v1/publish')
export class PublishController {
  constructor(
    @Inject(PublishService)
    private readonly publishService: PublishService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  publish(): Promise<PublishResult> {
    return this.publishService.publish();
  }
}
