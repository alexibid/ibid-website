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
  type CreateUrlInput,
  type ExpandedUrlRecord,
  type UpdateUrlInput,
  type UrlRecord,
  UrlsService,
} from './urls.service';

@Controller('api/v1/urls')
export class UrlsController {
  constructor(@Inject(UrlsService) private readonly urlsService: UrlsService) {}

  @Get()
  findAll(
    @Query('lang') lang?: string,
    @Query('expand') expand?: string,
  ): Promise<Array<UrlRecord | ExpandedUrlRecord>> {
    return this.urlsService.findAll({
      lang,
      expandPage: expand === 'page',
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<UrlRecord> {
    return this.urlsService.findOne(id);
  }

  @Post()
  create(@Body() body: unknown): Promise<UrlRecord> {
    return this.urlsService.create(validateCreateUrl(body));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown): Promise<UrlRecord> {
    return this.urlsService.update(id, validateUpdateUrl(body));
  }

  @Put(':id')
  replace(@Param('id') id: string, @Body() body: unknown): Promise<UrlRecord> {
    return this.urlsService.update(id, validateUpdateUrl(body));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.urlsService.remove(id);
  }
}

function validateCreateUrl(body: unknown): CreateUrlInput {
  if (!isRecord(body)) {
    throw new BadRequestException('URL payload must be an object');
  }
  const { id, url, lang, pageId } = body;
  if (typeof url !== 'string' || typeof lang !== 'string' || typeof pageId !== 'string') {
    throw new BadRequestException('URL requires url, lang, and pageId strings');
  }
  return {
    ...(typeof id === 'string' ? { id } : {}),
    url,
    lang,
    pageId,
  };
}

function validateUpdateUrl(body: unknown): UpdateUrlInput {
  if (!isRecord(body)) {
    throw new BadRequestException('URL payload must be an object');
  }
  const { url, lang, pageId } = body;
  return {
    ...(typeof url === 'string' ? { url } : {}),
    ...(typeof lang === 'string' ? { lang } : {}),
    ...(typeof pageId === 'string' ? { pageId } : {}),
  };
}
