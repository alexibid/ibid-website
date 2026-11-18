import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { isPageInput, isPagePatch, isPageQuery } from './content.guards.js';
import type { Page } from './content.model.js';
import { PAGES_REPOSITORY, type PagesRepository } from './pages.repository.js';
import { SNAPSHOT_PUBLISHER, type SnapshotPublisher } from '../snapshot/snapshot.publisher.js';

@Controller('api/v1/pages')
export class PagesController {
  constructor(
    @Inject(PAGES_REPOSITORY)
    private readonly repository: PagesRepository,
    @Inject(SNAPSHOT_PUBLISHER)
    private readonly publisher: Pick<SnapshotPublisher, 'publish'>,
  ) {}

  @Get()
  async list(@Query() query: unknown): Promise<readonly Page[]> {
    if (!isPageQuery(query)) {
      throw new BadRequestException('Invalid page query');
    }
    return this.repository.list(query);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<Page> {
    return this.repository.get(id);
  }

  @Post()
  async create(@Body() body: unknown): Promise<Page> {
    if (!isPageInput(body)) {
      throw new BadRequestException('Invalid page input');
    }
    const page = await this.repository.create(body);
    await this.publisher.publish();
    return page;
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() patch: unknown): Promise<Page> {
    if (!isPagePatch(patch)) {
      throw new BadRequestException('Invalid page patch');
    }
    const page = await this.repository.update(id, patch);
    await this.publisher.publish();
    return page;
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    await this.repository.remove(id);
    await this.publisher.publish();
  }
}
