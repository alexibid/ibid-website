import { PageType } from '../app/domain/models/page-type.enum';

export const CMS_ROUTE_GUARD_CASES = {
  knownPages: [
    { path: 'pt/prefacio', type: PageType.Chapter },
    { path: 'de', type: PageType.Home },
    { path: 'pt/saida', type: PageType.Exit }
  ]
};
