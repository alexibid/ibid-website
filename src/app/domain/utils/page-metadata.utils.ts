import type { CmsPageMetadata } from '../models/cms.interface';

export interface PageSeoFields {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly product: boolean;
}

export interface PageMetadataFields extends PageSeoFields {
  readonly location: string;
}

const EDITABLE_KEYS: readonly string[] = ['location', 'seoTitle', 'seoDescription', 'product'];

export function readPageSeoFields(metadata: CmsPageMetadata): PageSeoFields {
  return {
    seoTitle: metadata.seoTitle ?? '',
    seoDescription: metadata.seoDescription ?? '',
    product: metadata.product === true
  };
}

export function buildPageMetadata(
  current: CmsPageMetadata,
  fields: PageMetadataFields
): CmsPageMetadata & { location: string } {
  const preserved = Object.fromEntries(Object.entries(current).filter(([key]) => !EDITABLE_KEYS.includes(key)));
  const seoTitle = fields.seoTitle.trim();
  const seoDescription = fields.seoDescription.trim();
  return {
    ...preserved,
    location: fields.location,
    ...(seoTitle ? { seoTitle } : {}),
    ...(seoDescription ? { seoDescription } : {}),
    ...(fields.product ? { product: true } : {})
  };
}
