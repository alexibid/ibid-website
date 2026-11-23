import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { isRecord } from '../common/type-guards.util';
import {
  type CreatePageInput,
  type PageRecord,
  PagesService,
  type UpdatePageInput,
} from './pages.service';

@Controller(['api/v1/pages', 'api/pages'])
export class PagesController {
  constructor(@Inject(PagesService) private readonly pagesService: PagesService) {}

  @Get()
  findAll(
    @Query('type') type?: string,
    @Query('lang') lang?: string,
  ): Promise<PageRecord[]> {
    return this.pagesService.findAll({ type, lang });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<PageRecord> {
    return this.pagesService.findOne(id);
  }

  @Post()
  create(@Body() body: unknown): Promise<PageRecord> {
    return this.pagesService.create(validateCreatePage(body));
  }

  @Patch(':id')
  patch(@Param('id') id: string, @Body() body: unknown): Promise<PageRecord> {
    return this.pagesService.update(id, validateUpdatePage(body));
  }

  @Put(':id')
  replace(@Param('id') id: string, @Body() body: unknown): Promise<PageRecord> {
    return this.pagesService.update(id, validateUpdatePage(body));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.pagesService.remove(id);
  }
}

function validateCreatePage(body: unknown): CreatePageInput {
  if (!isRecord(body)) {
    throw new BadRequestException('Page payload must be an object');
  }
  const { id, title, content, type, lang, location, metadata } = body;
  if (
    typeof title !== 'string' ||
    typeof content !== 'string' ||
    typeof type !== 'string' ||
    typeof lang !== 'string'
  ) {
    throw new BadRequestException('Page requires title, content, type, and lang strings');
  }
  return {
    ...(typeof id === 'string' ? { id } : {}),
    title,
    content,
    type,
    lang,
    ...(typeof location === 'string' ? { location } : {}),
    ...(isRecord(metadata) ? { metadata } : {}),
  };
}

function validateUpdatePage(body: unknown): UpdatePageInput {
  if (!isRecord(body)) {
    throw new BadRequestException('Page payload must be an object');
  }
  const { title, content, type, lang, location, metadata } = body;
  return {
    ...(typeof title === 'string' ? { title } : {}),
    ...(typeof content === 'string' ? { content } : {}),
    ...(typeof type === 'string' ? { type } : {}),
    ...(typeof lang === 'string' ? { lang } : {}),
    ...(typeof location === 'string' ? { location } : {}),
    ...(isRecord(metadata) ? { metadata } : {}),
  };
}
