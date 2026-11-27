import { PageType } from '../models/page-type.enum';

export const STYLESHEET_MANIFEST_ID = 'website-stylesheets';

export type StylesheetBundle = 'home' | 'exit';

export const PAGE_STYLESHEET_BUNDLES: Readonly<Record<PageType, readonly StylesheetBundle[]>> = {
  [PageType.Home]: ['home'],
  [PageType.Chapter]: [],
  [PageType.Exit]: ['exit']
};
