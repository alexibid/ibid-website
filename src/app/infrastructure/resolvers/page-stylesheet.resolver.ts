import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { PageType } from '../../domain/models/page-type.enum';
import { PageStylesheetService } from '../services/page-stylesheet.service';

export function pageStylesheetResolver(type: PageType): ResolveFn<void> {
  return () => inject(PageStylesheetService).loadFor(type);
}
